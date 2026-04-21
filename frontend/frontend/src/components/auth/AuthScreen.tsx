import { motion } from "framer-motion";
import { ArrowLeft, Zap } from "lucide-react";
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

const glassBar = cn(
  "rounded-full border border-white/40 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-slate-900/5 backdrop-blur-xl",
  "dark:border-white/10 dark:bg-slate-100/55 dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] dark:ring-white/10",
);

const glassCard = cn(
  "rounded-[2rem] border border-white/40 bg-white/70 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-slate-900/5 backdrop-blur-xl sm:p-10",
  "dark:border-white/10 dark:bg-slate-100/62 dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] dark:ring-white/10",
);

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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 font-sans text-slate-900">
      <LoadingOverlay
        show={loading}
        fullScreen
        className="z-[100]"
        message={
          mode === "login" ? "Anmeldung …" : "Konto wird angelegt …"
        }
      />
      <AnimatedGridBackground
        width={40}
        height={40}
        numSquares={40}
        className={animatedGridHeroSurfaceClassName}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[min(100vw,52rem)] w-[min(100vw,52rem)] -translate-x-1/2 -translate-y-[28%] rounded-full bg-indigo-500/15 blur-[100px] mix-blend-multiply dark:bg-indigo-600/20 dark:mix-blend-normal"
        aria-hidden
      />

      <header className="pointer-events-none absolute inset-x-0 top-4 z-20 px-4 sm:px-6">
        <div className="pointer-events-auto mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link
            to="/"
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400",
              glassBar,
            )}
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            <span className="hidden sm:inline">Zurück zur Startseite</span>
            <span className="sm:hidden">Start</span>
          </Link>
          <div className={cn("flex items-center px-1.5 py-1", glassBar)}>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-24 sm:px-6 sm:pb-16 sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px]"
        >
          <div className={glassCard}>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/25">
                <Zap size={26} className="text-white" fill="currentColor" strokeWidth={2} aria-hidden />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {appName}
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                {mode === "login" ? "Willkommen zurück" : "Account erstellen"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                  className="rounded-xl bg-red-50/90 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-500/20 dark:ring-red-500/30"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <Button type="submit" variant="premium" className="h-11 w-full" disabled={loading}>
                {loading ? "Bitte warten…" : mode === "login" ? "Einloggen" : "Registrieren"}
              </Button>
            </form>

            <button
              type="button"
              className="mt-6 w-full text-center text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
              onClick={() => {
                setMode((m) => (m === "login" ? "register" : "login"));
                setError(null);
              }}
            >
              {mode === "login" ? "Noch kein Konto? Registrieren" : "Schon ein Konto? Einloggen"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
