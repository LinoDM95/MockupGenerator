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
import { getErrorMessage } from "../lib/error";
import { toast } from "../lib/toast";
import { useAppStore } from "../store/appStore";
import { AppPage } from "../components/ui/AppPage";
import { AppPageSectionHeader } from "../components/ui/AppPageSectionHeader";
import { AppSubNavPageLayout } from "../components/ui/AppSubNavPageLayout";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";

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
    >
      <AppPage className="space-y-10 !pt-0">
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

        <div className="w-full min-w-0">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start lg:gap-8">
            <div className="min-w-0">
              <AppPageSectionHeader
                icon={UserCircle}
                title="Profil & Kontaktdaten"
                description="Benutzername und E-Mail-Adresse für Login und Benachrichtigungen."
              />
              <div className="mt-4">
                <Card padding="md" variant="default">
                  {profileLoading ? (
                    <p className="text-sm font-medium text-slate-600">Profil wird geladen …</p>
                  ) : (
                    <form onSubmit={handleProfileSubmit} className="space-y-5">
                      <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-900/5">
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
                          variant="secondary"
                          size="sm"
                          disabled={profileSaving}
                        >
                          {profileSaving ? "Speichern …" : "Profil speichern"}
                        </Button>
                      </div>
                    </form>
                  )}
                </Card>
              </div>
            </div>

            <div className="min-w-0">
              <AppPageSectionHeader
                icon={KeyRound}
                title="Passwort"
                description="Aktuelles Passwort und neues Passwort (mindestens 8 Zeichen)."
              />
              <div className="mt-4">
                <Card padding="md" variant="default">
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
                        variant="secondary"
                        size="sm"
                        disabled={passwordSaving}
                      >
                        {passwordSaving ? "Wird geändert …" : "Passwort ändern"}
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full min-w-0">
          <AppPageSectionHeader
            icon={Download}
            title="Deine Daten"
            description="JSON-Export mit Stammdaten und Metadaten zu deinen Vorlagen (ohne Bilddateien)."
          />
          <div className="mt-4 max-w-2xl">
            <Card padding="md" variant="default">
              <p className="text-sm font-medium leading-relaxed text-slate-600">
                Du kannst eine maschinenlesbare Übersicht herunterladen — sinnvoll für Backups oder
                Anfragen nach Art. 15 DSGVO. Enthalten sind keine API-Schlüssel und keine
                Binärdaten.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  disabled={profileLoading || exportBusy}
                  onClick={() => void handleExport()}
                >
                  <Download size={16} strokeWidth={2} aria-hidden />
                  {exportBusy ? "Export …" : "Daten exportieren (JSON)"}
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <div className="w-full min-w-0">
          <AppPageSectionHeader
            icon={CreditCard}
            title="Abrechnung & Zahlungen"
            description="Stripe: Zahlungsmethoden, Rechnungen, Abos und Steuerdaten."
          />
          <div className="mt-4 max-w-2xl space-y-4">
            <Card padding="md" variant="default">
              <p className="text-sm font-medium leading-relaxed text-slate-600">
                Die Integration mit <span className="font-semibold text-slate-800">Stripe</span>{" "}
                (Checkout, Kundenportal, Rechnungs-PDF) ist vorgesehen. Du wirst hier Zahlungsmittel
                verwalten, Verlauf einsehen und Abos verwalten können — ohne die App zu verlassen.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button type="button" variant="secondary" size="sm" disabled>
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
            </Card>
          </div>
        </div>

        <div className="w-full min-w-0">
          <AppPageSectionHeader
            icon={AlertTriangle}
            title="Konto schließen"
            description="Dauerhaft löschen: Alle Vorlagen, Integrationen und persönlichen Daten zu diesem Konto."
          />
          <div className="mt-4 max-w-2xl">
            <Card
              padding="md"
              variant="default"
              className="ring-1 ring-amber-500/20 ring-inset"
            >
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
            </Card>
          </div>
        </div>
      </AppPage>

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
