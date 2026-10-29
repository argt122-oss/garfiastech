import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin_/login")({
  ssr: false,
  head: () => ({ meta: [{ title: "Acceso — Panel" }, { name: "robots", content: "noindex" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Si el correo existe, te enviamos un enlace para restablecer la contraseña.");
        setMode("login");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error("Correo o contraseña incorrectos");
      navigate({ to: "/admin", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-8 shadow-soft">
        <div>
          <h1 className="text-2xl font-bold">{mode === "login" ? "Iniciar sesión" : "Recuperar contraseña"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Panel de administración</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode === "login" && (
          <div className="space-y-2">
            <Label htmlFor="pw">Contraseña</Label>
            <Input id="pw" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Procesando…" : mode === "login" ? "Entrar" : "Enviar enlace"}
        </Button>
        <div className="flex justify-between text-sm">
          <button type="button" className="text-primary hover:underline" onClick={() => setMode(mode === "login" ? "forgot" : "login")}>
            {mode === "login" ? "Olvidé mi contraseña" : "Volver"}
          </button>
          <Link to="/" className="text-muted-foreground hover:underline">
            Ir al sitio
          </Link>
        </div>
      </form>
    </div>
  );
}
