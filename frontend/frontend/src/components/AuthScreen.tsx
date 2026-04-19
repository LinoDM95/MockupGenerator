import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Zap } from "lucide-react";
import { motion } from "framer-motion";

import { login, register } from "../api/auth";
import { getErrorMessage } from "../lib/error";
import { useAppStore } from "../store/appStore";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { ThemeToggle } from "./ui/ThemeToggle";

export const AuthScreen = () => {
  const accessToken = useAppStore((s) => s.accessToken);
  const setTokens = useAppStore((s) => s.setTokens);
  const navigate = useNavigate();
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
        const tokens = await login(username, password);
        setTokens(tokens.access, tokens.refresh);
        navigate("/app", { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (accessToken) return <Navigate to="/app" replace />;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle size="sm" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <Card padding="lg" className="w-full">
          <div className="mb-8 text-center">
            <Link
              to="/"
              className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600"
            >
              <ArrowLeft size={14} strokeWidth={1.75} aria-hidden />
              Zurück
            </Link>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
              <Zap size={20} className="text-white" fill="currentColor" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Creative Engine</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
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
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600 ring-1 ring-red-100">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? "Bitte warten…" : mode === "login" ? "Einloggen" : "Registrieren"}
            </Button>
          </form>

          <button
            type="button"
            className="mt-6 w-full text-center text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600"
            onClick={() => {
              setMode((m) => (m === "login" ? "register" : "login"));
              setError(null);
            }}
          >
            {mode === "login" ? "Noch kein Konto? Registrieren" : "Schon ein Konto? Einloggen"}
          </button>
        </Card>
      </motion.div>
    </div>
  );
};
