import { ArrowLeft, MessageCircle } from "lucide-react";
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
import { AppPage } from "../components/ui/AppPage";
import { AppPageSectionHeader } from "../components/ui/AppPageSectionHeader";
import { AppSubNavPageLayout } from "../components/ui/AppSubNavPageLayout";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { cn } from "../lib/cn";
import { getErrorMessage } from "../lib/error";
import { feedbackStatusLabel } from "../lib/feedbackStatus";
import { toast } from "../lib/toast";
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

export const FeedbackPage = () => {
  const navigate = useNavigate();
  const openConfirm = useAppStore((s) => s.openConfirm);
  const [isStaff, setIsStaff] = useState(false);
  const [threads, setThreads] = useState<FeedbackThreadListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

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
      await loadList();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <AppSubNavPageLayout
      title="Feedback"
      description="Schreibe uns Verbesserungsvorschläge oder Fragen — du siehst nur deine eigenen Gespräche. Unser Team kann antworten und den Status anpassen."
      contentClassName="pt-6"
    >
      <AppPage className="space-y-8 !pt-0">
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

        <div className="grid min-h-0 gap-8 lg:grid-cols-[minmax(0,340px)_1fr] lg:items-start">
          <div className="min-w-0 space-y-6">
            <AppPageSectionHeader
              icon={MessageCircle}
              title="Neues Feedback"
              description="Betreff optional — beschreibe kurz dein Anliegen; du kannst später nachfragen."
            />
            <Card padding="md" variant="default">
              <form onSubmit={handleCreate} className="space-y-4">
                <Input
                  label="Betreff (optional)"
                  name="subject"
                  value={newSubject}
                  onChange={(ev) => setNewSubject(ev.target.value)}
                  placeholder="z. B. Export oder Vorlagen"
                />
                <div className="w-full">
                  <label
                    htmlFor="feedback-new-body"
                    className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-700"
                  >
                    Nachricht
                  </label>
                  <textarea
                    id="feedback-new-body"
                    name="message"
                    value={newMessage}
                    onChange={(ev) => setNewMessage(ev.target.value)}
                    rows={4}
                    required
                    className={cn(
                      "w-full cursor-text rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10",
                    )}
                    placeholder="Dein Feedback …"
                  />
                </div>
                <Button type="submit" disabled={createBusy}>
                  {createBusy ? "Senden …" : "Absenden"}
                </Button>
              </form>
            </Card>

            <AppPageSectionHeader
              icon={MessageCircle}
              title="Deine Gespräche"
              description={
                isStaff
                  ? "Als Team-Mitglied siehst du alle Nutzer-Threads."
                  : "Nur deine eigenen Einträge — niemand sonst kann sie lesen."
              }
            />
            <Card padding="none" variant="default" className="overflow-hidden">
              {listLoading ? (
                <p className="p-4 text-sm font-medium text-slate-600">Wird geladen …</p>
              ) : threads.length === 0 ? (
                <p className="p-4 text-sm font-medium text-slate-600">Noch keine Gespräche.</p>
              ) : (
                <ul className="divide-y divide-slate-100" aria-label="Feedback-Liste">
                  {threads.map((t) => {
                    const active = t.id === selectedId;
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(t.id)}
                          className={cn(
                            "flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors",
                            active ? "bg-indigo-50/60" : "hover:bg-slate-50",
                          )}
                        >
                          <span className="text-sm font-bold tracking-tight text-slate-900">
                            {(t.subject || "").trim() || "Ohne Betreff"}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {feedbackStatusLabel(t.status)}
                            {t.removed_at ? " · Entfernt" : ""}
                          </span>
                          {isStaff && t.user_username ? (
                            <span className="text-xs font-medium text-slate-500">
                              Nutzer: {t.user_username}
                            </span>
                          ) : null}
                          <span className="text-xs font-medium text-slate-500">
                            {t.message_count} Nachricht
                            {t.message_count === 1 ? "" : "en"} · {formatDe(t.updated_at)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          <div className="min-w-0">
            <AppPageSectionHeader
              icon={MessageCircle}
              title="Konversation"
              description="Antworten vom Team sind markiert. Du kannst jederzeit nachhaken."
            />
            <Card padding="md" variant="default" className="min-h-[280px]">
              {!selectedId ? (
                <p className="text-sm font-medium text-slate-600">
                  Wähle links ein Gespräch oder lege ein neues an.
                </p>
              ) : detailLoading || !detail ? (
                <p className="text-sm font-medium text-slate-600">Wird geladen …</p>
              ) : (
                <div className="flex min-h-0 flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold tracking-tight text-slate-900">
                        {(detail.subject || "").trim() || "Ohne Betreff"}
                      </h2>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        Status: {feedbackStatusLabel(detail.status)}
                        {detail.removed_at ? " · vom Support entfernt" : ""}
                      </p>
                      {isStaff && detail.user_username ? (
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          Nutzer: {detail.user_username}
                        </p>
                      ) : null}
                    </div>
                    {isStaff ? (
                      <div className="flex min-w-[200px] flex-col gap-2 sm:min-w-[240px]">
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
                    className="max-h-[min(52vh,520px)] space-y-3 overflow-y-auto overscroll-contain pr-1"
                    aria-label="Nachrichten"
                  >
                    {detail.messages.map((m) => (
                      <li
                        key={m.id}
                        className={cn(
                          "rounded-xl px-3 py-2.5 text-sm font-medium ring-1 ring-inset ring-slate-900/5",
                          m.is_staff_message
                            ? "bg-indigo-50/80 text-slate-900"
                            : "bg-slate-50 text-slate-800",
                        )}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {m.is_staff_message ? "Team" : m.author_username} · {formatDe(m.created_at)}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap leading-relaxed">{m.body}</p>
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
                    <form onSubmit={(e) => void handleReply(e)} className="space-y-2 border-t border-slate-100 pt-4">
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
                          rows={3}
                          className={cn(
                            "w-full cursor-text rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10",
                          )}
                          placeholder="Deine Nachricht …"
                        />
                      </div>
                      <Button type="submit" disabled={replyBusy || !reply.trim()}>
                        {replyBusy ? "Senden …" : "Senden"}
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </AppPage>
    </AppSubNavPageLayout>
  );
};
