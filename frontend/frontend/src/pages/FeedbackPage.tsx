import { ArrowLeft, MessageCircle, PenLine } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

const glassCard = cn(
  "rounded-2xl bg-white/80 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-xl dark:bg-slate-100/78 dark:ring-white/10",
);

const statusBadgeClass = (status: FeedbackThreadStatus) =>
  cn(
    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-slate-900/5 dark:ring-white/10",
    status === "pending" && "bg-slate-100 text-slate-700",
    status === "in_progress" && "bg-amber-50 text-amber-800",
    status === "answered" && "bg-emerald-50 text-emerald-800",
    status === "closed" && "bg-slate-200/80 text-slate-700",
  );

export const FeedbackPage = () => {
  const navigate = useNavigate();
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
    "w-full cursor-text rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-inset ring-slate-900/5 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:bg-slate-100 dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] dark:ring-white/10 dark:placeholder:text-slate-500",
  );

  return (
    <AppSubNavPageLayout
      title="Feedback"
      description="Schreibe uns Verbesserungsvorschläge oder Fragen — du siehst nur deine eigenen Gespräche. Unser Team kann antworten und den Status anpassen."
      contentClassName="pt-6"
      className="[&_header_h1]:text-3xl [&_header_h1]:tracking-tight sm:[&_header_h1]:text-4xl"
    >
      <div className="min-w-0 rounded-2xl bg-slate-50/50 px-4 py-6 sm:px-6 sm:py-8">
        <AppPage className="space-y-12 !pt-0">
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate("/app")}
            >
              <ArrowLeft size={16} strokeWidth={2} aria-hidden />
              Zurück zur App
            </Button>
          </div>

          <div className="grid min-h-0 gap-6 lg:grid-cols-[minmax(0,300px)_1fr] lg:items-start lg:gap-8">
            <div className="flex min-w-0 flex-col gap-6">
              <div className={cn(glassCard, "overflow-hidden p-3")}>
                <button
                  type="button"
                  onClick={handleOpenCompose}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all",
                    isComposing
                      ? "bg-indigo-50/80 text-indigo-800 ring-1 ring-inset ring-indigo-500/20"
                      : "text-slate-800 hover:bg-slate-50/80",
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
                    <PenLine size={16} strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0 leading-tight">Neues Feedback erstellen</span>
                </button>
              </div>

              <div
                className={cn(
                  glassCard,
                  "flex max-h-[min(60vh,520px)] min-h-0 flex-col gap-4 overflow-hidden p-4",
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {isStaff ? "Alle Gespräche" : "Deine Beiträge"}
                </p>
                {listLoading ? (
                  <p className="text-xs font-medium text-slate-600">Wird geladen …</p>
                ) : threads.length === 0 ? (
                  <p className="text-xs font-medium text-slate-600">
                    Noch keine Einträge.
                  </p>
                ) : (
                  <div
                    className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pr-1"
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
                            "flex w-full flex-col gap-3 rounded-2xl bg-slate-50/50 p-4 text-left ring-1 ring-inset ring-slate-900/5 transition-all hover:scale-[1.01] dark:ring-white/10",
                            active &&
                              "bg-indigo-50/60 ring-2 ring-indigo-500/25 dark:ring-indigo-400/30",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="line-clamp-2 text-left text-xs font-bold leading-snug tracking-tight text-slate-900">
                              {(t.subject || "").trim() || "Ohne Betreff"}
                            </span>
                            <span className={statusBadgeClass(t.status)}>{feedbackStatusLabel(t.status)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 text-[10px] font-medium text-slate-500">
                            {t.removed_at ? <span className="font-bold uppercase tracking-wide">Entfernt</span> : null}
                            <span className="font-normal normal-case">
                              {t.message_count} Nachrichten · {formatDe(t.updated_at)}
                            </span>
                          </div>
                          {isStaff && t.user_username ? (
                            <span className="text-[10px] font-medium text-slate-500">
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

            <div className="min-w-0">
              {isComposing ? (
                <>
                  <AppPageSectionHeader
                    icon={PenLine}
                    title="Neues Feedback"
                    description="Betreff ist optional. Beschreibe dein Anliegen — du kannst später in der Konversation nachfragen."
                  />
                  <div
                    className={cn(
                      glassCard,
                      "mt-6 min-h-[min(70vh,560px)] p-6 sm:p-8",
                    )}
                  >
                    <form onSubmit={(e) => void handleCreate(e)} className="flex min-h-0 flex-col gap-6">
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
                          className="text-xs font-semibold tracking-wide text-slate-700"
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
                      <div className="mt-2 flex flex-wrap items-center gap-3 pt-6 ring-1 ring-inset ring-slate-900/5 dark:ring-white/10">
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
                      glassCard,
                      "mt-6 min-h-[min(70vh,560px)] p-6 sm:p-8",
                    )}
                  >
                    {!selectedId ? (
                      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-2 text-center">
                        <MessageCircle
                          className="text-slate-300"
                          size={40}
                          strokeWidth={1.5}
                          aria-hidden
                        />
                        <p className="text-sm font-medium text-slate-600">
                          Wähle links einen Beitrag oder tippe oben auf{" "}
                          <span className="font-bold text-slate-800">
                            Neues Feedback erstellen
                          </span>
                          .
                        </p>
                      </div>
                    ) : detailLoading || !detail ? (
                      <p className="text-sm font-medium text-slate-600">
                        Wird geladen …
                      </p>
                    ) : (
                      <div className="flex min-h-0 flex-col gap-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-bold tracking-tight text-slate-900">
                                {(detail.subject || "").trim() || "Ohne Betreff"}
                              </h2>
                              <span className={statusBadgeClass(detail.status)}>
                                {feedbackStatusLabel(detail.status)}
                              </span>
                            </div>
                            {detail.removed_at ? (
                              <p className="text-xs font-medium text-slate-500">
                                vom Support entfernt
                              </p>
                            ) : null}
                            {isStaff && detail.user_username ? (
                              <p className="text-xs font-medium text-slate-500">
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
                          className="max-h-[min(48vh,480px)] min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1"
                          aria-label="Nachrichten"
                        >
                          {detail.messages.map((m) => (
                            <li
                              key={m.id}
                              className={cn(
                                "rounded-2xl px-4 py-4 text-sm font-medium ring-1 ring-inset ring-slate-900/5 dark:ring-white/10",
                                m.is_staff_message
                                  ? "bg-indigo-50/50 text-slate-900"
                                  : "bg-slate-50/80 text-slate-800",
                              )}
                            >
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                {m.is_staff_message ? "Team" : m.author_username} ·{" "}
                                {formatDe(m.created_at)}
                              </p>
                              <p className="mt-2 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                            </li>
                          ))}
                        </ul>

                        {detail.removed_at ? (
                          <p className="text-sm font-medium text-slate-600">
                            {isStaff
                              ? "Dieses Gespräch wurde für den Nutzer entfernt — nur noch Lesen."
                              : "Dieses Gespräch wurde vom Support geschlossen und aus deiner Übersicht entfernt."}
                          </p>
                        ) : (
                          <form
                            onSubmit={(e) => void handleReply(e)}
                            className="space-y-3 pt-6 ring-1 ring-inset ring-slate-900/5 dark:ring-white/10"
                          >
                            <div className="w-full">
                              <label
                                htmlFor="feedback-reply"
                                className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-700"
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
      </div>
    </AppSubNavPageLayout>
  );
};
