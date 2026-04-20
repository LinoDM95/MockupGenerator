import { useEffect, useRef } from "react";

import { ackFeedbackNotifications, fetchPendingFeedbackNotifications } from "../../api/feedback";
import { getErrorMessage } from "../../lib/common/error";
import { toast } from "../../lib/ui/toast";

const POLL_MS = 50_000;

/**
 * Zeigt ausstehende Feedback-Benachrichtigungen (Antwort, Status, Entfernt) als Toasts
 * und bestätigt sie serverseitig, damit sie nicht erneut erscheinen.
 */
export const FeedbackNotificationPoller = () => {
  const busy = useRef(false);

  useEffect(() => {
    const tick = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const { results } = await fetchPendingFeedbackNotifications();
        if (!results.length) return;
        for (const n of results) {
          const text = n.body ? `${n.title} — ${n.body}` : n.title;
          toast.info(text, 7000);
        }
        await ackFeedbackNotifications(results.map((r) => r.id));
      } catch (e) {
        console.warn("feedback notifications poll", getErrorMessage(e));
      } finally {
        busy.current = false;
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
};
