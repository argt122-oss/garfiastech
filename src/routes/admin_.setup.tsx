import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getSetupStatus, startAdminSetup } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin_/setup")({
  ssr: false,
  loader: () => getSetupStatus(),
  head: () => ({ meta: [{ title: "Primer acceso — Panel" }, { name: "robots", content: "noindex" }] }),
  component: Setup,
});

function Setup() {
  const status = Route.useLoaderData();
  const start = useServerFn(startAdminSetup);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  if (!status.available) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Configuración completada</h1>
        <p className="text-sm text-muted-foreground">El primer acceso ya fue configurado y esta pantalla está desactivada.</p>
        <Link to="/admin/login" className="text-sm font-semibold text-primary hover:underline">
          Ir al inicio de sesión
        </Link>
      </Shell>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await start({ data: { email } });
      if (res.ok) setSent(res.message);
      else toast.error(res.message);
    } catch {
      toast.error("Correo no válido o error de conexión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <h1 className="text-2xl font-bold">Primer acceso</h1>
      {sent ? (
        <p className="text-sm text-muted-foreground">{sent} Abre el enlace del correo para elegir tu contraseña.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted-foreground">Ingresa el correo autorizado. Te enviaremos un enlace seguro para crear tu contraseña.</p>
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Enviando…" : "Enviar enlace"}
          </Button>
        </form>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-8 shadow-soft">{children}</div>
    </div>
  );
}
