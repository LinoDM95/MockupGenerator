import { ArrowLeft, CreditCard, KeyRound, UserCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { changePassword, fetchCurrentUser, patchCurrentUser } from "../api/auth";
import { getErrorMessage } from "../lib/error";
import { toast } from "../lib/toast";
import { AppPage } from "../components/ui/AppPage";
import { AppPageSectionHeader } from "../components/ui/AppPageSectionHeader";
import { AppSubNavPageLayout } from "../components/ui/AppSubNavPageLayout";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
export const AccountPage = () => {
  const navigate = useNavigate();
  const [profileLoading, setProfileLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const me = await fetchCurrentUser();
      setUsername(me.username);
      setEmail(me.email ?? "");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameSaving(true);
    try {
      const me = await patchCurrentUser({ username: username.trim() });
      setUsername(me.username);
      toast.success("Benutzername wurde gespeichert.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUsernameSaving(false);
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

  return (
    <AppSubNavPageLayout
      title="Konto"
      description="Profil, Abrechnung und Zahlungen — ein Ort für dein Nutzerkonto bei Creative Engine."
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
                description="Benutzername und E-Mail zu deinem Login."
              />
              <div className="mt-4">
                <Card padding="md" variant="default">
                  {profileLoading ? (
                    <p className="text-sm font-medium text-slate-600">Profil wird geladen …</p>
                  ) : (
                    <form onSubmit={handleUsernameSubmit} className="space-y-5">
                      {email ? (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            E-Mail
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">{email}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            Die E-Mail kann hier noch nicht geändert werden.
                          </p>
                        </div>
                      ) : null}
                      <Input
                        label="Benutzername"
                        name="username"
                        autoComplete="username"
                        value={username}
                        onChange={(ev) => setUsername(ev.target.value)}
                        required
                      />
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="submit"
                          variant="secondary"
                          size="sm"
                          disabled={usernameSaving}
                        >
                          {usernameSaving ? "Speichern …" : "Benutzername speichern"}
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
      </AppPage>
    </AppSubNavPageLayout>
  );
};
