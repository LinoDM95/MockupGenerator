import { fetchAiStatus } from "../api/ai";
import { fetchPendingFeedbackNotifications } from "../api/feedback";
import { fetchGelatoListTemplates, fetchGelatoStatus } from "../api/gelato";
import { fetchTemplateSets } from "../api/sets";
import { fetchIntegrationStatus } from "../api/settings";
import { useAppStore } from "../store/appStore";

/**
 * Nach gültiger Session: parallell alle nutzerbezogenen Read-Endpunkte warmfahren,
 * die sonst beim Öffnen der Tabs nachgeladen werden (Caches + Zustand).
 *
 * `fetchCurrentUser` sollte zuvor mindestens einmal erfolgreich gelaufen sein
 * (z. B. AppShell oder direkt nach Login), damit der Nutzer-Cache gefüllt ist.
 */
export const prefetchAuthenticatedSession = async (): Promise<void> => {
  await Promise.allSettled([
    fetchIntegrationStatus(),
    fetchAiStatus(),
    fetchGelatoStatus(),
    fetchPendingFeedbackNotifications(),
  ]);

  try {
    const g = await fetchGelatoStatus();
    if (g.connected) {
      await fetchGelatoListTemplates().catch(() => undefined);
    }
  } catch {
    /* Gelato optional */
  }

  try {
    const sets = await fetchTemplateSets();
    const { setTemplateSets, globalSetId, setGlobalSetId } = useAppStore.getState();
    setTemplateSets(sets);
    if (sets.length > 0 && !globalSetId) {
      setGlobalSetId(sets[0].id);
    }
  } catch {
    /* Sets lädt useLoadTemplateSets bei Bedarf nach */
  }
};
