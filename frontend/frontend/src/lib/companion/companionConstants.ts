/**
 * PrintFlow Engine — lokaler FastAPI-Dienst (Standard: Port 8001, Django bleibt auf 8000).
 *
 * - **Upscaler „lokal“** nur, wenn `PRINTFLOW_LOCAL_STACK_ENABLED` (Vite per `StartMockupApp.bat` mit
 *   `VITE_PRINTFLOW_LOCAL_STACK=1`). Sonst kein Companion im UI, keine Polls.
 * - Dev mit lokalem Stack: `/__companion` → Vite-Proxy, gleiche Origin.
 * - Override: `VITE_COMPANION_URL` z. B. `http://127.0.0.1:8001`
 */
const envUrl = import.meta.env.VITE_COMPANION_URL?.trim();

export const COMPANION_BASE_URL =
  envUrl ||
  (import.meta.env.DEV ? "/__companion" : "http://localhost:8001");

/**
 * Nur `true`, wenn der Vite-Dev-Server mit `VITE_PRINTFLOW_LOCAL_STACK=1` oder `true` gestartet wurde
 * (`StartMockupApp.bat` setzt das). Reines `npm run dev` / Produktion: `false` — kein lokaler Engine-Modus.
 */
export const PRINTFLOW_LOCAL_STACK_ENABLED =
  import.meta.env.DEV &&
  (import.meta.env.VITE_PRINTFLOW_LOCAL_STACK === "1" ||
    import.meta.env.VITE_PRINTFLOW_LOCAL_STACK === "true");

const isLoopbackHostname = (hostname: string): boolean => {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "::1") return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  return m !== null && Number(m[1]) === 127;
};

const isPrivateLanIpv4 = (hostname: string): boolean => {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 127) return false;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
};

/**
 * Chrome „Local Network Access“ (ehem. Private Network Access): Von einer **HTTPS**-Seite aus
 * darf `fetch` zu `http://localhost` / LAN nur mit deklariertem Ziel-Adressraum laufen — sonst
 * blockiert der Browser mit „loopback address space“ / ERR_FAILED, unabhängig von CORS-Headern.
 *
 * @see https://developer.chrome.com/blog/local-network-access/
 */
export const resolveCompanionTargetAddressSpace = (
  companionBaseUrl: string,
  pageProtocol: string,
): "local" | "private" | undefined => {
  if (pageProtocol !== "https:") return undefined;
  if (!companionBaseUrl.startsWith("http")) return undefined;
  try {
    const u = new URL(companionBaseUrl);
    if (u.protocol !== "http:") return undefined;
    const host = u.hostname;
    if (isLoopbackHostname(host)) return "local";
    if (isPrivateLanIpv4(host)) return "private";
    return "private";
  } catch {
    return undefined;
  }
};

/** `RequestInit` für alle `fetch`-Aufrufe zum PrintFlow Engine (Prod: HTTPS → http://…). */
export const mergeCompanionFetchInit = (init?: RequestInit): RequestInit => {
  const ts =
    typeof window !== "undefined"
      ? resolveCompanionTargetAddressSpace(
          COMPANION_BASE_URL,
          window.location.protocol,
        )
      : undefined;
  const base: RequestInit & { targetAddressSpace?: string } = ts
    ? { targetAddressSpace: ts }
    : {};
  return { ...base, ...init };
};
