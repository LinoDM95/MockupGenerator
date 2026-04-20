import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  Download,
  KeyRound,
  Trash2,
  UserCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  changePassword,
  deleteAccount,
  fetchAccountDataExport,
  fetchCurrentUser,
  patchCurrentUser,
} from "../api/auth";
import { AppPage } from "../components/ui/layout/AppPage";
import { AppPageSectionHeader } from "../components/ui/layout/AppPageSectionHeader";
import { AppSubNavPageLayout } from "../components/ui/layout/AppSubNavPageLayout";
import { Button } from "../components/ui/primitives/Button";
import { Input } from "../components/ui/primitives/Input";
import { Modal } from "../components/ui/overlay/Modal";
import { cn } from "../lib/ui/cn";
import { getErrorMessage } from "../lib/common/error";
import { toast } from "../lib/ui/toast";
import { useAppStore } from "../store/appStore";

const formatDeDateTime = (iso: string | null): string => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const sectionCard = cn(
  "rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-xl dark:bg-slate-100/78 dark:ring-white/10 sm:p-8",
);

const dangerSectionCard = cn(
  "rounded-2xl bg-red-50/30 p-6 shadow-sm ring-1 ring-red-500/10 backdrop-blur-xl dark:ring-red-500/20 sm:p-8",
);

export const AccountPage = () => {
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);
  const [profileLoading, setProfileLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [dateJoined, setDateJoined] = useState<string | null>(null);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const me = await fetchCurrentUser();
      setUsername(me.username);
      setEmail(me.email ?? "");
      setDateJoined(me.date_joined ?? null);
      setLastLogin(me.last_login ?? null);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const me = await patchCurrentUser({
        username: username.trim(),
        email: email.trim(),
      });
      setUsername(me.username);
      setEmail(me.email ?? "");
      setDateJoined(me.date_joined ?? null);
      setLastLogin(me.last_login ?? null);
      toast.success("Profil wurde gespeichert.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleExport = async () => {
    setExportBusy(true);
    try {
      const data = await fetchAccountDataExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = username.replace(/[^a-zA-Z0-9._-]+/g, "_") || "konto";
      a.download = `creative-engine-kontodaten-${safeName}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export wurde heruntergeladen.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExportBusy(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Die neuen Passwörter stimmen nicht überein.");
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Passwort wurde geändert.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteBusy(true);
    try {
      await deleteAccount({
        password: deletePassword,
        confirm_username: deleteConfirmUsername,
      });
      setDeleteOpen(false);
      setDeletePassword("");
      setDeleteConfirmUsername("");
      toast.success("Dein Konto wurde gelöscht.");
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  const closeDeleteModal = () => {
    if (deleteBusy) return;
    setDeleteOpen(false);
    setDeletePassword("");
    setDeleteConfirmUsername("");
  };

  return (
    <AppSubNavPageLayout
      title="Konto"
      description="Profil, Sicherheit und deine Daten — alles, was dein Nutzerkonto betrifft."
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

          <div className="mx-auto w-full min-w-0 max-w-3xl space-y-12">
            <div className="flex flex-col gap-6">
              <AppPageSectionHeader
                icon={UserCircle}
                title="Profil & Kontaktdaten"
                description="Benutzername und E-Mail-Adresse für Login und Benachrichtigungen."
              />
              <div className={sectionCard}>
                {profileLoading ? (
                  <p className="text-sm font-medium text-slate-600">
                    Profil wird geladen …
                  </p>
                ) : (
                  <form onSubmit={handleProfileSubmit} className="space-y-5">
                    <div className="rounded-xl bg-slate-50/80 px-4 py-3 ring-1 ring-inset ring-slate-900/5 dark:ring-white/10">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Konto
                      </p>
                      <dl className="mt-2 space-y-1 text-sm font-medium text-slate-700">
                        <div className="flex flex-wrap justify-between gap-2">
                          <dt className="text-slate-500">Registriert am</dt>
                          <dd>{formatDeDateTime(dateJoined)}</dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-2">
                          <dt className="text-slate-500">Zuletzt angemeldet</dt>
                          <dd>{formatDeDateTime(lastLogin)}</dd>
                        </div>
                      </dl>
                    </div>
                    <Input
                      label="Benutzername"
                      name="username"
                      autoComplete="username"
                      value={username}
                      onChange={(ev) => setUsername(ev.target.value)}
                      required
                    />
                    <Input
                      label="E-Mail"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(ev) => setEmail(ev.target.value)}
                      placeholder="optional"
                    />
                    <p className="text-xs font-medium text-slate-500">
                      Die E-Mail darf leer bleiben. Sie muss serverseitig eindeutig sein, wenn du sie
                      setzt.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="submit"
                        variant="premium"
                        size="sm"
                        disabled={profileSaving}
                      >
                        {profileSaving ? "Speichern …" : "Profil speichern"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <AppPageSectionHeader
                icon={KeyRound}
                title="Sicherheit & Passwort"
                description="Aktuelles Passwort und neues Passwort (mindestens 8 Zeichen)."
              />
              <div className={sectionCard}>
                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  <Input
                    label="Aktuelles Passwort"
                    name="current_password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(ev) => setCurrentPassword(ev.target.value)}
                    required
                  />
                  <Input
                    label="Neues Passwort"
                    name="new_password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(ev) => setNewPassword(ev.target.value)}
                    required
                    minLength={8}
                  />
                  <Input
                    label="Neues Passwort wiederholen"
                    name="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(ev) => setConfirmPassword(ev.target.value)}
                    required
                    minLength={8}
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="submit"
                      variant="premium"
                      size="sm"
                      disabled={passwordSaving}
                    >
                      {passwordSaving ? "Wird geändert …" : "Passwort ändern"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <AppPageSectionHeader
                icon={Download}
                title="Deine Daten"
                description="JSON-Export mit Stammdaten und Metadaten zu deinen Vorlagen (ohne Bilddateien)."
              />
              <div className={sectionCard}>
                <p className="text-sm font-medium leading-relaxed text-slate-600">
                  Du kannst eine maschinenlesbare Übersicht herunterladen — sinnvoll für Backups oder
                  Anfragen nach Art. 15 DSGVO. Enthalten sind keine API-Schlüssel und keine
                  Binärdaten.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="premium"
                    size="sm"
                    className="gap-2"
                    disabled={profileLoading || exportBusy}
                    onClick={() => void handleExport()}
                  >
                    <Download size={16} strokeWidth={2} aria-hidden />
                    {exportBusy ? "Export …" : "Daten exportieren (JSON)"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <AppPageSectionHeader
                icon={CreditCard}
                title="Abrechnung & Zahlungen"
                description="Stripe: Zahlungsmethoden, Rechnungen, Abos und Steuerdaten."
              />
              <div className={sectionCard}>
                <p className="text-sm font-medium leading-relaxed text-slate-600">
                  Die Integration mit <span className="font-semibold text-slate-800">Stripe</span>{" "}
                  (Checkout, Kundenportal, Rechnungs-PDF) ist vorgesehen. Du wirst hier Zahlungsmittel
                  verwalten, Verlauf einsehen und Abos verwalten können — ohne die App zu verlassen.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button type="button" variant="outline" size="sm" disabled>
                    Stripe verbinden
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled>
                    Rechnungen
                  </Button>
                </div>
                <p className="mt-4 text-xs font-medium text-slate-500">
                  Hinweis: Keine Zahlungsdaten werden aktuell erfasst; diese Schaltflächen sind
                  Platzhalter.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <AppPageSectionHeader
                icon={AlertTriangle}
                title="Gefahrenzone"
                description="Konto dauerhaft löschen: Alle Vorlagen, Integrationen und persönlichen Daten zu diesem Konto."
              />
              <div className={dangerSectionCard}>
                <p className="text-sm font-medium leading-relaxed text-slate-600">
                  Diese Aktion kann nicht rückgängig gemacht werden. Du musst danach ein neues Konto
                  registrieren, falls du die App wieder nutzen möchtest.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="gap-2"
                    disabled={profileLoading}
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 size={16} strokeWidth={2} aria-hidden />
                    Konto endgültig löschen
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </AppPage>
      </div>

      <Modal
        isOpen={deleteOpen}
        title="Konto wirklich löschen?"
        message={
          "Gib dein aktuelles Passwort ein und bestätige mit deinem exakten Benutzernamen.\n\nAlle zugehörigen Daten werden entfernt."
        }
        onConfirm={() => {}}
        onCancel={closeDeleteModal}
        footer={
          <div className="flex flex-col gap-4">
            <Input
              label="Passwort"
              name="delete_password"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(ev) => setDeletePassword(ev.target.value)}
            />
            <Input
              label={`Benutzername zur Bestätigung (${username})`}
              name="delete_confirm_username"
              autoComplete="off"
              value={deleteConfirmUsername}
              onChange={(ev) => setDeleteConfirmUsername(ev.target.value)}
            />
            <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" disabled={deleteBusy} onClick={closeDeleteModal}>
                Abbrechen
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={
                  deleteBusy ||
                  !deletePassword ||
                  deleteConfirmUsername.trim() !== username.trim()
                }
                onClick={() => void handleDeleteAccount()}
              >
                {deleteBusy ? "Wird gelöscht …" : "Endgültig löschen"}
              </Button>
            </div>
          </div>
        }
      />
    </AppSubNavPageLayout>
  );
};
