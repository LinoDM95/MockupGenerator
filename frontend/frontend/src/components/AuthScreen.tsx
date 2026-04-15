import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { login, register } from "../api/auth";
import { getErrorMessage } from "../lib/error";
import { useAppStore } from "../store/appStore";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";

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

  if (accessToken) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-sm" padding="lg">
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft size={14} strokeWidth={1.75} /> Zurück
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Mockup Generator Pro
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Melde dich an, um loszulegen
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Bitte warten…" : mode === "login" ? "Einloggen" : "Registrieren"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-6 w-full text-center text-sm text-slate-500 transition-colors hover:text-indigo-600"
          onClick={() => {
            setMode((m) => (m === "login" ? "register" : "login"));
            setError(null);
          }}
        >
          {mode === "login" ? "Noch kein Konto? Registrieren" : "Schon ein Konto? Einloggen"}
        </button>
      </Card>
    </div>
  );
};
