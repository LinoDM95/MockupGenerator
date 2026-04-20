import type { FeedbackThreadStatus } from "../api/feedback";

export const feedbackStatusLabel = (s: FeedbackThreadStatus): string => {
  const m: Record<FeedbackThreadStatus, string> = {
    pending: "Ausstehend",
    in_progress: "In Bearbeitung",
    answered: "Beantwortet",
    closed: "Geschlossen",
  };
  return m[s] ?? s;
};
