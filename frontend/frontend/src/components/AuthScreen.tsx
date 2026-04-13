import { useState } from "react";

import { login, register } from "../api/auth";
import { useAppStore } from "../store/appStore";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";

export const AuthScreen = () => {
  const setTokens = useAppStore((s) => s.setTokens);
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-4">
      <Card className="w-full max-w-md" padding="lg">
        <h1 className="mb-1 text-2xl font-bold text-neutral-900">Etsy Mockup Generator Pro</h1>
        <p className="mb-6 text-sm text-neutral-500">Anmeldung für dein Vorlagen-Konto</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Benutzername" name="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
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
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Bitte warten…" : mode === "login" ? "Einloggen" : "Registrieren"}
          </Button>
        </form>
        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-blue-600 hover:underline"
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
