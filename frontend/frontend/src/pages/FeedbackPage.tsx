import { MessageCircle, PenLine } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { fetchCurrentUser } from "../api/auth";
import {
  createFeedbackThread,
  deleteFeedbackThread,
  fetchFeedbackThread,
  fetchFeedbackThreads,
  patchFeedbackThreadStatus,
  postFeedbackMessage,
  type FeedbackThreadDetail,
  type FeedbackThreadListItem,
  type FeedbackThreadStatus,
} from "../api/feedback";
import { AppPage } from "../components/ui/layout/AppPage";
import { AppPageSectionHeader } from "../components/ui/layout/AppPageSectionHeader";
import { AppSubNavPageLayout } from "../components/ui/layout/AppSubNavPageLayout";
import { Button } from "../components/ui/primitives/Button";
import { Input } from "../components/ui/primitives/Input";
import { Select } from "../components/ui/primitives/Select";
import { cn } from "../lib/ui/cn";
import { getErrorMessage } from "../lib/common/error";
import { feedbackStatusLabel } from "../lib/common/feedbackStatus";
import { WORKSPACE_ZINC_MUTED } from "../lib/ui/workspaceSurfaces";
import { toast } from "../lib/ui/toast";
import { useAppStore } from "../store/appStore";

const formatDe = (iso: string | null): string => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const panelCard = cn(
  "rounded-[length:var(--pf-radius-lg)] bg-[color:var(--pf-bg-elevated)] shadow-[var(--pf-shadow-sm)] ring-1 ring-[color:var(--pf-border)]",
);

const statusBadgeClass = (status: FeedbackThreadStatus) =>
  cn(
    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-slate-900/5 dark:ring-white/10",
    status === "pending" && "bg-[color:var(--pf-bg-muted)] text-[color:var(--pf-fg)]",
    status === "in_progress" && "bg-[color:var(--pf-warning-bg)] text-[color:var(--pf-warning)]",
    status === "answered" && "bg-[color:var(--pf-success-bg)] text-[color:var(--pf-success)]",
    status === "closed" && "bg-[color:var(--pf-bg-muted)] text-[color:var(--pf-fg-muted)]",
  );

export const FeedbackPage = () => {
  const openConfirm = useAppStore((s) => s.openConfirm);
  const [isStaff, setIsStaff] = useState(false);
  const [threads, setThreads] = useState<FeedbackThreadListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [detail, setDetail] = useState<FeedbackThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const p = await fetchFeedbackThreads(1);
      setThreads(p.results);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const d = await fetchFeedbackThread(id);
      setDetail(d);
    } catch (e) {
      toast.error(getErrorMessage(e));
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const me = await fetchCurrentUser();
        setIsStaff(Boolean(me.is_staff || me.is_superuser));
      } catch {
        setIsStaff(false);
      }
    })();
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId || isComposing) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, isComposing, loadDetail]);

  const handleOpenCompose = () => {
    setIsComposing(true);
    setSelectedId(null);
    setDetail(null);
  };

  const handleSelectThread = (id: string) => {
    setIsComposing(false);
    setSelectedId(id);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = newMessage.trim();
    if (!msg) {
      toast.error("Bitte eine Nachricht eingeben.");
      return;
    }
    setCreateBusy(true);
    try {
      const d = await createFeedbackThread({
        subject: newSubject.trim(),
        message: msg,
      });
      setNewSubject("");
      setNewMessage("");
      toast.success("Feedback wurde gesendet.");
      await loadList();
      setIsComposing(false);
      setSelectedId(d.id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreateBusy(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !detail) return;
    const body = reply.trim();
    if (!body) return;
    setReplyBusy(true);
    try {
      await postFeedbackMessage(selectedId, body);
      setReply("");
      toast.success("Nachricht gesendet.");
      await loadDetail(selectedId);
      await loadList();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setReplyBusy(false);
    }
  };

  const handleStatusChange = async (next: FeedbackThreadStatus) => {
    if (!selectedId || !detail) return;
    setStatusBusy(true);
    try {
      const d = await patchFeedbackThreadStatus(selectedId, next);
      setDetail(d);
      await loadList();
      toast.success("Status aktualisiert.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setStatusBusy(false);
    }
  };

  const handleStaffRemove = async () => {
    if (!selectedId || !detail) return;
    const ok = await openConfirm(
      "Dieses Feedback für den Nutzer aus der Übersicht entfernen? Der Vorgang kann hier nicht rückgängig gemacht werden.",
    );
    if (!ok) return;
    try {
      await deleteFeedbackThread(selectedId);
      toast.success("Feedback wurde entfernt.");
      setSelectedId(null);
      setDetail(null);
      setIsComposing(false);
      await loadList();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const textareaClass = cn(
    "w-full cursor-text rounded-xl bg-[color:var(--pf-bg-elevated)] px-4 py-3 text-sm font-medium text-[color:var(--pf-fg)] shadow-[var(--pf-shadow-sm)] ring-1 ring-[color:var(--pf-border)] placeholder:text-[color:var(--pf-fg-faint)] focus:outline-none focus:ring-4 focus:ring-indigo-500/10",
  );

  return (
    <AppSubNavPageLayout hideTitle title="Feedback" description="" contentClassName="pt-0">
      <h1 className="sr-only">Feedback</h1>
      <AppPage className="space-y-6 !pt-0">
        <div className="grid min-h-0 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-stretch lg:gap-8 lg:min-h-[calc(100dvh-7.5rem)]">
          <div className="flex h-full min-h-0 min-w-0 flex-col gap-6">
            <div className={cn(panelCard, "shrink-0 overflow-hidden p-3")}>
              <button
                type="button"
                onClick={handleOpenCompose}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                  isComposing
                    ? "bg-[color:var(--pf-accent-bg)] text-[color:var(--pf-fg)] ring-1 ring-inset ring-[color:var(--pf-accent-border)]"
                    : "text-[color:var(--pf-fg)] hover:bg-[color:var(--pf-bg-muted)]",
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white shadow-[0_2px_8px_rgb(0,0,0,0.08)] ring-1 ring-inset ring-white/25">
                  <PenLine size={16} strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0 leading-tight">Neues Feedback erstellen</span>
              </button>
            </div>

            <div
              className={cn(
                panelCard,
                "flex min-h-[min(50vh,360px)] min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:min-h-0",
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--pf-fg-subtle)]">
                {isStaff ? "Alle Gespräche" : "Deine Beiträge"}
              </p>
              {listLoading ? (
                <p className={cn("text-xs font-medium", WORKSPACE_ZINC_MUTED)}>Wird geladen …</p>
              ) : threads.length === 0 ? (
                <p className={cn("text-xs font-medium", WORKSPACE_ZINC_MUTED)}>Noch keine Einträge.</p>
              ) : (
                <div
                  className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pr-1"
                  role="list"
                  aria-label="Feedback-Liste"
                >
                  {threads.map((t) => {
                    const active = !isComposing && t.id === selectedId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="listitem"
                        onClick={() => handleSelectThread(t.id)}
                        className={cn(
                          "flex w-full flex-col gap-3 rounded-xl bg-[color:var(--pf-bg-muted)]/60 p-4 text-left ring-1 ring-inset ring-slate-900/5 transition-colors hover:bg-[color:var(--pf-bg-muted)] dark:ring-white/10",
                          active &&
                            "bg-[color:var(--pf-accent-bg)] ring-2 ring-[color:var(--pf-accent-border)]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="line-clamp-2 text-left text-xs font-bold leading-snug tracking-tight text-[color:var(--pf-fg)]">
                            {(t.subject || "").trim() || "Ohne Betreff"}
                          </span>
                          <span className={statusBadgeClass(t.status)}>{feedbackStatusLabel(t.status)}</span>
                        </div>
                        <div
                          className={cn(
                            "flex flex-wrap items-center gap-x-2 text-[10px] font-medium",
                            WORKSPACE_ZINC_MUTED,
                          )}
                        >
                          {t.removed_at ? (
                            <span className="font-bold uppercase tracking-wide">Entfernt</span>
                          ) : null}
                          <span className="font-normal normal-case">
                            {t.message_count} Nachrichten · {formatDe(t.updated_at)}
                          </span>
                        </div>
                        {isStaff && t.user_username ? (
                          <span className={cn("text-[10px] font-medium", WORKSPACE_ZINC_MUTED)}>
                            {t.user_username}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col lg:h-full lg:min-h-0">
            {isComposing ? (
              <>
                <AppPageSectionHeader
                  icon={PenLine}
                  title="Neues Feedback"
                  description="Betreff ist optional. Beschreibe dein Anliegen — du kannst später in der Konversation nachfragen."
                />
                <div
                  className={cn(
                    panelCard,
                    "mt-6 flex min-h-[min(60vh,320px)] min-w-0 flex-1 flex-col p-6 sm:p-8 lg:min-h-0",
                  )}
                >
                    <form onSubmit={(e) => void handleCreate(e)} className="flex min-h-0 flex-1 flex-col gap-6">
                      <Input
                        label="Betreff (optional)"
                        name="subject"
                        value={newSubject}
                        onChange={(ev) => setNewSubject(ev.target.value)}
                        placeholder="z. B. Export, Vorlagen, Fehler …"
                      />
                      <div className="flex min-h-0 flex-1 flex-col gap-2">
                        <label
                          htmlFor="feedback-new-body"
                          className="text-xs font-semibold tracking-wide text-[color:var(--pf-fg-muted)]"
                        >
                          Nachricht
                        </label>
                        <textarea
                          id="feedback-new-body"
                          name="message"
                          value={newMessage}
                          onChange={(ev) => setNewMessage(ev.target.value)}
                          required
                          rows={14}
                          className={cn(textareaClass, "min-h-[220px] flex-1 resize-y")}
                          placeholder="Dein Feedback, so ausführlich wie nötig …"
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-[color:var(--pf-border-subtle)] pt-6">
                        <Button type="submit" variant="premium" disabled={createBusy}>
                          {createBusy ? "Senden …" : "Feedback absenden"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setIsComposing(false)}>
                          Abbrechen
                        </Button>
                      </div>
                    </form>
                  </div>
                </>
              ) : (
                <>
                  <AppPageSectionHeader
                    icon={MessageCircle}
                    title="Konversation"
                    description="Antworten vom Team sind hervorgehoben. Wähle links einen Eintrag oder erstelle ein neues Feedback."
                  />
                <div
                  className={cn(
                    panelCard,
                    "mt-6 flex min-h-[min(60vh,320px)] min-w-0 flex-1 flex-col p-6 sm:p-8 lg:min-h-0",
                  )}
                >
                    {!selectedId ? (
                      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-2 text-center">
                        <MessageCircle
                          className="text-[color:var(--pf-fg-faint)]"
                          size={40}
                          strokeWidth={1.5}
                          aria-hidden
                        />
                        <p className={cn("max-w-md text-sm font-medium", WORKSPACE_ZINC_MUTED)}>
                          Wähle links einen Beitrag oder tippe oben auf{" "}
                          <span className="font-semibold text-[color:var(--pf-fg)]">
                            Neues Feedback erstellen
                          </span>
                          .
                        </p>
                      </div>
                    ) : detailLoading || !detail ? (
                      <p className={cn("text-sm font-medium", WORKSPACE_ZINC_MUTED)}>Wird geladen …</p>
                    ) : (
                      <div className="flex min-h-0 flex-1 flex-col gap-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-bold tracking-tight text-[color:var(--pf-fg)]">
                                {(detail.subject || "").trim() || "Ohne Betreff"}
                              </h2>
                              <span className={statusBadgeClass(detail.status)}>
                                {feedbackStatusLabel(detail.status)}
                              </span>
                            </div>
                            {detail.removed_at ? (
                              <p className={cn("text-xs font-medium", WORKSPACE_ZINC_MUTED)}>
                                vom Support entfernt
                              </p>
                            ) : null}
                            {isStaff && detail.user_username ? (
                              <p className={cn("text-xs font-medium", WORKSPACE_ZINC_MUTED)}>
                                Nutzer: {detail.user_username}
                              </p>
                            ) : null}
                          </div>
                          {isStaff ? (
                            <div className="flex min-w-[200px] flex-col gap-3 sm:min-w-[240px]">
                              <Select
                                label="Status (Team)"
                                name="status"
                                value={detail.status}
                                disabled={statusBusy || Boolean(detail.removed_at)}
                                onChange={(ev) =>
                                  void handleStatusChange(ev.target.value as FeedbackThreadStatus)
                                }
                              >
                                <option value="pending">{feedbackStatusLabel("pending")}</option>
                                <option value="in_progress">{feedbackStatusLabel("in_progress")}</option>
                                <option value="answered">{feedbackStatusLabel("answered")}</option>
                                <option value="closed">{feedbackStatusLabel("closed")}</option>
                              </Select>
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                disabled={Boolean(detail.removed_at)}
                                onClick={() => void handleStaffRemove()}
                              >
                                Für Nutzer entfernen
                              </Button>
                            </div>
                          ) : null}
                        </div>

                        <ul
                          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1"
                          aria-label="Nachrichten"
                        >
                          {detail.messages.map((m) => (
                            <li
                              key={m.id}
                              className={cn(
                                "rounded-xl px-4 py-4 text-sm font-medium ring-1 ring-inset ring-slate-900/5 dark:ring-white/10",
                                m.is_staff_message
                                  ? "bg-[color:var(--pf-accent-bg)] text-[color:var(--pf-fg)]"
                                  : "bg-[color:var(--pf-bg-muted)]/80 text-[color:var(--pf-fg)]",
                              )}
                            >
                              <p
                                className={cn(
                                  "text-[10px] font-bold uppercase tracking-widest",
                                  WORKSPACE_ZINC_MUTED,
                                )}
                              >
                                {m.is_staff_message ? "Team" : m.author_username} ·{" "}
                                {formatDe(m.created_at)}
                              </p>
                              <p className="mt-2 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                            </li>
                          ))}
                        </ul>

                        {detail.removed_at ? (
                          <p className={cn("text-sm font-medium", WORKSPACE_ZINC_MUTED)}>
                            {isStaff
                              ? "Dieses Gespräch wurde für den Nutzer entfernt — nur noch Lesen."
                              : "Dieses Gespräch wurde vom Support geschlossen und aus deiner Übersicht entfernt."}
                          </p>
                        ) : (
                          <form
                            onSubmit={(e) => void handleReply(e)}
                            className="space-y-3 border-t border-[color:var(--pf-border-subtle)] pt-6"
                          >
                            <div className="w-full">
                              <label
                                htmlFor="feedback-reply"
                                className="mb-1.5 block text-xs font-semibold tracking-wide text-[color:var(--pf-fg-muted)]"
                              >
                                {isStaff ? "Antwort senden" : "Nachricht / Nachfrage"}
                              </label>
                              <textarea
                                id="feedback-reply"
                                value={reply}
                                onChange={(ev) => setReply(ev.target.value)}
                                rows={4}
                                className={textareaClass}
                                placeholder="Deine Nachricht …"
                              />
                            </div>
                            <Button type="submit" variant="premium" disabled={replyBusy || !reply.trim()}>
                              {replyBusy ? "Senden …" : "Senden"}
                            </Button>
                          </form>
                        )}
                      </div>
                    )}
                </div>
              </>
            )}
          </div>
        </div>
      </AppPage>
    </AppSubNavPageLayout>
  );
};
