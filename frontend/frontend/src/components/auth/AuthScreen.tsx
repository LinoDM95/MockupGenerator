import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Zap } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { fetchCurrentUser, login, register } from "../../api/auth";
import { prefetchAuthenticatedSession } from "../../lib/sessionPrefetch";
import { getErrorMessage } from "../../lib/common/error";
import { cn } from "../../lib/ui/cn";
import { getLegalSiteConfig } from "../../lib/legal/config";
import { useAppStore } from "../../store/appStore";
import {
  AnimatedGridBackground,
  animatedGridHeroSurfaceClassName,
} from "../marketing/AnimatedGridBackground";
import { LoadingOverlay } from "../ui/LoadingOverlay";
import { Button } from "../ui/primitives/Button";
import { Input } from "../ui/primitives/Input";
import { ThemeToggle } from "../ui/primitives/ThemeToggle";

export const AuthScreen = () => {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const navigate = useNavigate();
  const { appName } = getLegalSiteConfig();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        await register({ username, password, email: email || undefined });
        setMode("login");
      } else {
        await login(username, password);
        await fetchCurrentUser();
        setAuthenticated(true);
        await prefetchAuthenticatedSession();
        navigate("/app", { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) return <Navigate to="/app" replace />;

  return (
    <div className="relative grid min-h-0 flex-1 overflow-hidden bg-[color:var(--pf-bg)] font-sans text-[color:var(--pf-fg)] lg:min-h-screen lg:grid-cols-2">
      <LoadingOverlay
        show={loading}
        fullScreen
        className="z-[100]"
        message={mode === "login" ? "Anmeldung …" : "Konto wird angelegt …"}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 px-4 py-4 sm:px-6 lg:col-span-2 lg:px-8">
        <Link
          to="/"
          className={cn(
            "pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--pf-fg)] shadow-[var(--pf-shadow-sm)] ring-1 ring-[color:var(--pf-border)] transition-colors hover:bg-[color:var(--pf-bg-muted)]",
          )}
        >
          <ArrowLeft size={16} strokeWidth={2} aria-hidden />
          <span className="hidden sm:inline">Zurück zur Startseite</span>
          <span className="sm:hidden">Start</span>
        </Link>
        <div
          className={cn(
            "pointer-events-auto flex items-center rounded-full px-1.5 py-1 shadow-[var(--pf-shadow-sm)] ring-1 ring-[color:var(--pf-border)]",
          )}
        >
          <ThemeToggle size="sm" />
        </div>
      </header>

      {/* Linke Spalte: Formular (PrintFlow-Prototyp) */}
      <div className="relative z-10 flex flex-col justify-center px-6 pb-16 pt-24 sm:px-10 sm:pt-28 lg:px-16 lg:pb-12 lg:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-[380px]"
        >
          <div className="mb-10 flex items-center gap-2">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[color:var(--pf-fg)]">
              <Zap size={15} className="text-[color:var(--pf-bg)]" fill="currentColor" strokeWidth={2} aria-hidden />
            </div>
            <span className="text-sm font-semibold tracking-tight text-[color:var(--pf-fg)]">{appName}</span>
          </div>

          <h1 className="text-[1.75rem] font-semibold leading-snug tracking-tight text-[color:var(--pf-fg)] sm:text-[2rem]">
            {mode === "login" ? "Willkommen zurück" : "Konto erstellen"}
          </h1>
          <p className="mt-2 text-[13px] font-medium leading-relaxed text-[color:var(--pf-fg-muted)]">
            {mode === "login"
              ? "Melde dich an, um deinen Shop zu verwalten."
              : "Starte kostenlos — ohne Kreditkarte."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              label="Benutzername"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            {mode === "register" ? (
              <Input
                label="E-Mail (optional)"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            ) : null}
            <Input
              label="Passwort"
              name="password"
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "register" ? 8 : undefined}
            />

            {error ? (
              <p
                className="rounded-lg bg-[color:var(--pf-danger-bg)] px-4 py-3 text-sm font-medium text-[color:var(--pf-danger)] ring-1 ring-inset ring-[color:var(--pf-danger)]/20"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" variant="primary" className="h-12 w-full gap-2" disabled={loading}>
              {loading ? "Bitte warten…" : mode === "login" ? "Anmelden" : "Registrieren"}
              {!loading ? <ArrowRight size={14} strokeWidth={2} aria-hidden /> : null}
            </Button>
          </form>

          <button
            type="button"
            className="mt-8 w-full text-center text-[13px] font-semibold text-[color:var(--pf-fg-muted)] transition-colors hover:text-[color:var(--pf-accent)]"
            onClick={() => {
              setMode((m) => (m === "login" ? "register" : "login"));
              setError(null);
            }}
          >
            {mode === "login" ? (
              <>
                Noch kein Konto?{" "}
                <span className="text-[color:var(--pf-accent)]">Jetzt kostenlos registrieren</span>
              </>
            ) : (
              <>
                Bereits ein Konto? <span className="text-[color:var(--pf-accent)]">Anmelden</span>
              </>
            )}
          </button>
        </motion.div>
      </div>

      {/* Rechte Spalte: Showcase */}
      <div className="relative hidden flex-col justify-center overflow-hidden border-l border-[color:var(--pf-border)] bg-[color:var(--pf-bg-subtle)] px-10 py-20 lg:flex lg:px-16">
        <AnimatedGridBackground
          width={40}
          height={40}
          numSquares={32}
          className={cn(animatedGridHeroSurfaceClassName, "opacity-40")}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-app-grid bg-app-grid-mask opacity-25"
          aria-hidden
        />
        <div className="relative z-[1] max-w-[460px]">
          <span className="mb-5 inline-flex rounded-md border border-[color:var(--pf-accent-border)] bg-[color:var(--pf-accent-bg)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[color:var(--pf-accent)]">
            Workflow
          </span>
          <h2 className="text-[1.375rem] font-semibold leading-snug tracking-tight text-[color:var(--pf-fg)]">
            Motive, Mockups &amp; Etsy — an einem Ort
          </h2>
          <p className="mt-3 text-[13px] font-medium leading-relaxed text-[color:var(--pf-fg-muted)]">
            Erstelle Vorlagen, rendere Mockups und bereite Listings vor — mit klaren Schritten und
            ohne Medienbruch.
          </p>
          <div className="mt-7 rounded-[length:var(--pf-radius-lg)] border border-[color:var(--pf-border)] bg-[color:var(--pf-bg-elevated)] p-4 shadow-[var(--pf-shadow-sm)] ring-1 ring-[color:var(--pf-border-subtle)]">
            <div className="mb-3 flex flex-wrap gap-2">
              {["Generator", "Vorlagen", "Etsy"].map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--pf-bg-muted)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--pf-fg-muted)] ring-1 ring-inset ring-[color:var(--pf-border-subtle)]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--pf-success)]" aria-hidden />
                  {label}
                </span>
              ))}
            </div>
            <p className="text-[12px] font-medium leading-relaxed text-[color:var(--pf-fg-muted)]">
              Nach dem Login gelangst du zu <strong className="text-[color:var(--pf-fg)]">Erstellen</strong>{" "}
              mit Generator, Vorlagen-Studio und Upscaler — dieselbe Oberfläche, die du von der
              App kennst.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
