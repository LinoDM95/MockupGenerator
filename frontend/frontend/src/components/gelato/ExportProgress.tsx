import { motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { GelatoExportTask } from "../../api/gelato";
import { gelatoGetTaskStatus } from "../../api/gelato";
import { Button } from "../ui/Button";

const POLL_INTERVAL_MS = 3000;

type Props = {
  taskIds: string[];
  onClose: () => void;
};

const statusIcon = (status: GelatoExportTask["status"]) => {
  switch (status) {
    case "success":
      return (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
          <Check size={14} className="text-green-600" />
        </div>
      );
    case "failed":
      return (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100">
          <AlertCircle size={14} className="text-red-500" />
        </div>
      );
    case "processing":
      return (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
          <Loader2 size={16} className="animate-spin text-indigo-600" />
        </div>
      );
    default:
      return (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100">
          <Clock size={14} className="text-slate-400" />
        </div>
      );
  }
};

const statusLabel = (status: GelatoExportTask["status"]) => {
  switch (status) {
    case "success":
      return "Fertig";
    case "failed":
      return "Fehler";
    case "processing":
      return "Verarbeite…";
    default:
      return "Wartend";
  }
};

export const ExportProgress = ({ taskIds, onClose }: Props) => {
  const [tasks, setTasks] = useState<GelatoExportTask[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allDone = tasks.length > 0 && tasks.every(
    (t) => t.status === "success" || t.status === "failed",
  );

  const poll = useCallback(async () => {
    try {
      const data = await gelatoGetTaskStatus(taskIds);
      setTasks(data);
    } catch {
      /* silent */
    }
  }, [taskIds]);

  useEffect(() => {
    void poll();
    intervalRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [poll]);

  useEffect(() => {
    if (allDone && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [allDone]);

  const total = taskIds.length;
  const done = tasks.filter((t) => t.status === "success").length;
  const failed = tasks.filter((t) => t.status === "failed").length;
  const pct = total > 0 ? Math.round(((done + failed) / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Gelato Export
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">
              {done} von {total} erfolgreich
              {failed > 0 && (
                <span className="ml-1 text-red-500">({failed} fehlgeschlagen)</span>
              )}
            </span>
            <span className="font-semibold text-indigo-600">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full max-w-full rounded-full bg-indigo-600"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ ease: "linear", duration: 0.25 }}
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto border-t border-slate-100 px-5 py-3">
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50"
              >
                {statusIcon(task.status)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {task.title || task.id.slice(0, 8)}
                  </p>
                  {task.status === "failed" && task.error_message && (
                    <p className="truncate text-xs text-red-500" title={task.error_message}>
                      {task.error_message}
                    </p>
                  )}
                  {task.status === "success" && task.gelato_product_id && (
                    <p className="text-xs text-slate-400">
                      Produkt: {task.gelato_product_id}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  {statusLabel(task.status)}
                </span>
              </div>
            ))}

            {tasks.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-slate-400" />
                <span className="ml-2 text-sm text-slate-500">Lade Status…</span>
              </div>
            )}
          </div>
        </div>

        {allDone && (
          <div className="border-t border-slate-200 px-5 py-4">
            <Button onClick={onClose} className="w-full">
              <Check size={16} /> Fertig
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
