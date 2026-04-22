import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ENGINE_VERSION_EXPECTED from "../../../../companion_app/ENGINE_VERSION?raw";

import type { CompanionCatalog, CompanionStatus } from "../api/companion";
import {
  fetchCompanionCatalog,
  installCompanionModel,
  setCompanionActiveModel,
  uninstallCompanionModel,
  uninstallCompanionVulkanRuntime,
} from "../api/companion";
import {
  appendUpscaleParams,
  parseUpscaleImageResponse,
  type UpscaleImageParams,
  type UpscaleResult,
} from "../api/upscaler";

import { COMPANION_BASE_URL } from "../lib/companion/companionConstants";
import {
  fetchCompanionTileProgress,
  type CompanionTileProgressReady,
} from "../lib/companion/companionTileProgress";

export { COMPANION_BASE_URL };

/** Gleiche Quelle wie der Companion: `companion_app/ENGINE_VERSION` (eine Zeile). */
export const EXPECTED_ENGINE_VERSION = ENGINE_VERSION_EXPECTED.trim();

const STATUS_TIMEOUT_MS = 1000;
const POLL_INTERVAL_MS = 12_000;
const TILE_POLL_INTERVAL_MS = 220;

export type ParallelTilesOption = "1" | "2" | "auto";

const fetchWithTimeout = async (
  input: string,
  init: RequestInit & { timeoutMs?: number },
): Promise<Response> => {
  const { timeoutMs = STATUS_TIMEOUT_MS, ...rest } = init;
  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    window.clearTimeout(t);
  }
};

export const useCompanionApp = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [engineVersion, setEngineVersion] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CompanionCatalog | null>(null);
  const [installedModelIds, setInstalledModelIds] = useState<string[]>([]);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [vulkanRuntimeInstalled, setVulkanRuntimeInstalled] = useState(true);
  const mountedRef = useRef(true);

  const isOutdated = useMemo(() => {
    if (!isOnline || engineVersion === null) return false;
    return engineVersion !== EXPECTED_ENGINE_VERSION;
  }, [isOnline, engineVersion]);

  const checkStatus = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setIsChecking(true);
    try {
      const res = await fetchWithTimeout(`${COMPANION_BASE_URL}/status`, {
        method: "GET",
        timeoutMs: STATUS_TIMEOUT_MS,
      });
      if (!mountedRef.current) return;
      if (!res.ok) {
        setIsOnline(false);
        setEngineVersion(null);
        setInstalledModelIds([]);
        setActiveModelId(null);
        setVulkanRuntimeInstalled(false);
        return;
      }
      const data = (await res.json()) as CompanionStatus;
      setIsOnline(data.status === "online");
      setEngineVersion(
        typeof data.version === "string" ? data.version.trim() : null,
      );
      setInstalledModelIds(data.installed_model_ids ?? []);
      setActiveModelId(data.active_model_id ?? null);
      setVulkanRuntimeInstalled(data.vulkan_runtime_installed !== false);
    } catch {
      if (mountedRef.current) {
        setIsOnline(false);
        setEngineVersion(null);
        setInstalledModelIds([]);
        setActiveModelId(null);
        setVulkanRuntimeInstalled(false);
      }
    } finally {
      if (mountedRef.current && !silent) setIsChecking(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      const c = await fetchCompanionCatalog();
      if (mountedRef.current) setCatalog(c);
    } catch {
      if (mountedRef.current) setCatalog(null);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void checkStatus();
    const id = window.setInterval(() => {
      void checkStatus({ silent: true });
    }, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
    };
  }, [checkStatus]);

  useEffect(() => {
    if (isOnline) void loadCatalog();
  }, [isOnline, loadCatalog]);

  const installModelById = useCallback(
    async (modelId: string) => {
      await installCompanionModel(modelId);
      await checkStatus({ silent: true });
      await loadCatalog();
    },
    [checkStatus, loadCatalog],
  );

  const selectActiveModel = useCallback(
    async (modelId: string) => {
      await setCompanionActiveModel(modelId);
      await checkStatus({ silent: true });
    },
    [checkStatus],
  );

  const uninstallModelById = useCallback(
    async (modelId: string) => {
      await uninstallCompanionModel(modelId);
      await checkStatus({ silent: true });
      await loadCatalog();
    },
    [checkStatus, loadCatalog],
  );

  const uninstallVulkanRuntime = useCallback(async () => {
    await uninstallCompanionVulkanRuntime();
    await checkStatus({ silent: true });
  }, [checkStatus]);

  const upscaleWithCompanion = useCallback(
    async (
      file: File,
      params: UpscaleImageParams,
      options?: {
        signal?: AbortSignal;
        modelId?: string;
        parallelTiles?: ParallelTilesOption;
        /** Bei gesetztem Callback: Polling auf /tile-progress/{id}, Kachel-Metriken */
        onTileProgress?: (snap: CompanionTileProgressReady) => void;
        /** Optional; sonst zufaellige ID wenn onTileProgress gesetzt */
        progressJobId?: string;
      },
    ): Promise<UpscaleResult> => {
      if (isOutdated) {
        throw new Error(
          "PrintFlow Engine veraltet — bitte die aktuelle PrintFlowEngine.exe installieren und neu starten.",
        );
      }
      const signal = options?.signal;
      const wantTileProgress =
        typeof options?.onTileProgress === "function";

      let jobId = (options?.progressJobId ?? "").trim();
      if (wantTileProgress) {
        if (!jobId) {
          jobId =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `pj-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        }
      }

      let pollId: number | null = null;
      const stopTilePoll = () => {
        if (pollId != null) {
          window.clearInterval(pollId);
          pollId = null;
        }
      };

      const runTilePoll = async () => {
        if (!wantTileProgress || !jobId) return;
        if (signal?.aborted) return;
        try {
          const data = await fetchCompanionTileProgress(jobId);
          if (!data.ready) return;
          options?.onTileProgress?.(data);
          if (data.finished) stopTilePoll();
        } catch {
          /* offline / race vor Server-Thread — ignorieren */
        }
      };

      if (wantTileProgress && jobId) {
        pollId = window.setInterval(() => {
          void runTilePoll();
        }, TILE_POLL_INTERVAL_MS);
        void runTilePoll();
      }

      const form = new FormData();
      form.append("image", file);
      appendUpscaleParams(form, params);
      form.append("parallel_tiles", options?.parallelTiles ?? "auto");
      if (options?.modelId?.trim()) {
        form.append("model_id", options.modelId.trim());
      }
      if (jobId) {
        form.append("progress_job_id", jobId);
      }

      try {
        const res = await fetch(`${COMPANION_BASE_URL}/upscale`, {
          method: "POST",
          body: form,
          signal,
        });

        if (!res.ok) {
          let detail = await res.text();
          try {
            const j = JSON.parse(detail) as { detail?: unknown };
            if (typeof j.detail === "string") detail = j.detail;
          } catch {
            /* keep text */
          }
          throw new Error(detail || `HTTP ${res.status}`);
        }

        return parseUpscaleImageResponse(res);
      } finally {
        stopTilePoll();
      }
    },
    [isOutdated],
  );

  return {
    isOnline,
    isChecking,
    engineVersion,
    isOutdated,
    catalog,
    loadCatalog,
    installedModelIds,
    activeModelId,
    vulkanRuntimeInstalled,
    installModelById,
    selectActiveModel,
    uninstallModelById,
    uninstallVulkanRuntime,
    upscaleWithCompanion,
  };
};
