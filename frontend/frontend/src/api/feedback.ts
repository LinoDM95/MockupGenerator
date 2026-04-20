import { apiJson } from "./client";

export type FeedbackThreadStatus = "pending" | "in_progress" | "answered" | "closed";

export type FeedbackMessage = {
  id: string;
  body: string;
  is_staff_message: boolean;
  author_username: string;
  created_at: string;
};

export type FeedbackThreadListItem = {
  id: string;
  subject: string;
  status: FeedbackThreadStatus;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  removed_at: string | null;
  user_username: string | null;
};

export type FeedbackThreadDetail = {
  id: string;
  subject: string;
  status: FeedbackThreadStatus;
  created_at: string;
  updated_at: string;
  removed_at: string | null;
  user_username: string | null;
  messages: FeedbackMessage[];
};

export type PaginatedThreads = {
  count: number;
  next: string | null;
  previous: string | null;
  results: FeedbackThreadListItem[];
};

export const fetchFeedbackThreads = (page = 1): Promise<PaginatedThreads> =>
  apiJson<PaginatedThreads>(`/api/feedback/threads/?page=${page}`);

export const fetchFeedbackThread = (id: string): Promise<FeedbackThreadDetail> =>
  apiJson<FeedbackThreadDetail>(`/api/feedback/threads/${id}/`);

export const createFeedbackThread = (payload: {
  subject?: string;
  message: string;
}): Promise<FeedbackThreadDetail> =>
  apiJson<FeedbackThreadDetail>("/api/feedback/threads/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const postFeedbackMessage = (
  threadId: string,
  body: string,
): Promise<FeedbackMessage> =>
  apiJson<FeedbackMessage>(`/api/feedback/threads/${threadId}/messages/`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });

export const patchFeedbackThreadStatus = (
  threadId: string,
  status: FeedbackThreadStatus,
): Promise<FeedbackThreadDetail> =>
  apiJson<FeedbackThreadDetail>(`/api/feedback/threads/${threadId}/`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const deleteFeedbackThread = (threadId: string): Promise<void> =>
  apiJson<undefined>(`/api/feedback/threads/${threadId}/`, {
    method: "DELETE",
  });

export type PendingNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  thread_id: string | null;
  created_at: string;
};

export const fetchPendingFeedbackNotifications = (): Promise<{ results: PendingNotification[] }> =>
  apiJson<{ results: PendingNotification[] }>("/api/feedback/notifications/pending/");

export const ackFeedbackNotifications = (ids: string[]): Promise<{ acknowledged: number }> =>
  apiJson<{ acknowledged: number }>("/api/feedback/notifications/ack/", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
