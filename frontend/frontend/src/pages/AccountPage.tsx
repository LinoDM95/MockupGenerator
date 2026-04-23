import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import {
  changePassword,
  deleteAccount,
  fetchAccountDataExport,
  fetchCurrentUser,
  patchCurrentUser,
} from "../api/auth";
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

const AccountPanel = ({
  title,
  description,
  children,
  danger = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  danger?: boolean;
}) => (
  <div
    className={cn(
      "overflow-hidden rounded-xl shadow-[var(--pf-shadow-sm)] ring-1",
      danger
        ? "bg-[color:var(--pf-danger-bg)]/25 ring-[color:var(--pf-danger)]/20"
        : "bg-[color:var(--pf-bg-elevated)] ring-[color:var(--pf-border)]",
    )}
  >
    <div
      className={cn(
        "border-b px-4 py-3 sm:px-5",
        danger
          ? "border-[color:var(--pf-danger)]/15 bg-[color:var(--pf-danger-bg)]/35"
          : "border-[color:var(--pf-border)] bg-[color:var(--pf-bg-muted)]/60",
      )}
    >
      <h2 className="text-[15px] font-semibold tracking-tight text-[color:var(--pf-fg)]">{title}</h2>
      <p className="mt-0.5 text-xs font-medium text-[color:var(--pf-fg-muted)]">{description}</p>
    </div>
    <div className="p-4 sm:p-6">{children}</div>
  </div>
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
    <AppSubNavPageLayout hideTitle title="Konto" description="">
      <h1 className="sr-only">Konto</h1>
      <div className="w-full min-w-0 space-y-6 pb-8">
        <div className="flex flex-wrap justify-end gap-2">
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

        <div className="mx-auto w-full min-w-0 space-y-6 lg:max-w-6xl">
          <AccountPanel
            title="Profil & Kontaktdaten"
            description="Benutzername und E-Mail-Adresse für Login und Benachrichtigungen."
          >
            {profileLoading ? (
              <p className="text-sm font-medium text-[color:var(--pf-fg-muted)]">
                Profil wird geladen …
              </p>
            ) : (
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div className="rounded-xl bg-[color:var(--pf-bg-muted)] px-4 py-3 ring-1 ring-inset ring-[color:var(--pf-border-subtle)]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--pf-fg-muted)]">
                    Konto
                  </p>
                  <dl className="mt-2 space-y-1 text-sm font-medium text-[color:var(--pf-fg)]">
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-[color:var(--pf-fg-muted)]">Registriert am</dt>
                      <dd>{formatDeDateTime(dateJoined)}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-[color:var(--pf-fg-muted)]">Zuletzt angemeldet</dt>
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
                <p className="text-xs font-medium text-[color:var(--pf-fg-muted)]">
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
          </AccountPanel>

          <AccountPanel
            title="Sicherheit & Passwort"
            description="Aktuelles Passwort und neues Passwort (mindestens 8 Zeichen)."
          >
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
          </AccountPanel>

          <AccountPanel
            title="Deine Daten"
            description="JSON-Export mit Stammdaten und Metadaten zu deinen Vorlagen (ohne Bilddateien)."
          >
            <p className="text-sm font-medium leading-relaxed text-[color:var(--pf-fg-muted)]">
              Du kannst eine maschinenlesbare Übersicht herunterladen — sinnvoll für Backups oder
              Anfragen nach Art. 15 DSGVO. Enthalten sind keine API-Schlüssel und keine Binärdaten.
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
          </AccountPanel>

          <AccountPanel
            title="Abrechnung & Zahlungen"
            description="Stripe: Zahlungsmethoden, Rechnungen, Abos und Steuerdaten."
          >
            <p className="text-sm font-medium leading-relaxed text-[color:var(--pf-fg-muted)]">
              Die Integration mit <span className="font-semibold text-[color:var(--pf-fg)]">Stripe</span>{" "}
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
            <p className="mt-4 text-xs font-medium text-[color:var(--pf-fg-muted)]">
              Hinweis: Keine Zahlungsdaten werden aktuell erfasst; diese Schaltflächen sind
              Platzhalter.
            </p>
          </AccountPanel>

          <AccountPanel
            title="Gefahrenzone"
            description="Konto dauerhaft löschen: Alle Vorlagen, Integrationen und persönlichen Daten zu diesem Konto."
            danger
          >
            <p className="text-sm font-medium leading-relaxed text-[color:var(--pf-fg-muted)]">
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
          </AccountPanel>
        </div>
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
