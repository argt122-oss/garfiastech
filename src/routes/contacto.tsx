import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { shellQuery } from "@/lib/queries";
import { submitContact } from "@/lib/public.functions";
import { contactSchema } from "@/lib/validation";
import { SocialLinks } from "@/components/site/SocialLinks";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contacto")({
  head: () => ({
    meta: [
      { title: "Contacto — Arturo Garfias Tambo" },
      { name: "description", content: "Escríbeme para conversar sobre proyectos, colaboraciones o trabajo remoto." },
      { property: "og:title", content: "Contacto — Arturo Garfias Tambo" },
      { property: "og:description", content: "Escríbeme para conversar sobre proyectos, colaboraciones o trabajo remoto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { data } = useSuspenseQuery(shellQuery);
  const send = useServerFn(submitContact);
  const [form, setForm] = useState({ name: "", email: "", message: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await send({ data: parsed.data });
      if (res.ok) setDone(true);
      else toast.error(res.error);
    } catch {
      toast.error("No pudimos enviar tu mensaje. Revisa tu conexión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hero-navy text-navy-foreground">
    <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[1fr_1.3fr] md:py-24">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-navy-foreground/70">Hablemos</p>
        <h1 className="text-4xl font-bold md:text-5xl">Contacto</h1>
        <p className="mt-4 text-navy-foreground/80">¿Tienes una idea o un proyecto? Escríbeme y te responderé lo antes posible.</p>
        {data.settings?.email && (
          <a href={`mailto:${data.settings.email}`} className="mt-6 block font-semibold text-navy-foreground underline-offset-4 hover:underline">
            {data.settings.email}
          </a>
        )}
        <SocialLinks settings={data.settings} className="mt-6" />
      </div>
      <div className="rounded-3xl border border-white/10 bg-card p-6 text-card-foreground shadow-lift md:p-10">
        {done ? (
          <div className="flex flex-col items-center py-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-wine" />
            <h2 className="mt-4 text-xl font-semibold">¡Mensaje enviado!</h2>
            <p className="mt-2 text-muted-foreground">Gracias por escribir. Te responderé pronto.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <div aria-hidden className="absolute -left-[9999px]">
              <label>
                Sitio web
                <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </label>
            </div>
            {(["name", "email"] as const).map((f) => (
              <div key={f} className="space-y-2">
                <Label htmlFor={f}>{f === "name" ? "Nombre" : "Correo"}</Label>
                <Input id={f} type={f === "email" ? "email" : "text"} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} aria-invalid={!!errors[f]} />
                {errors[f] && <p className="text-sm text-destructive">{errors[f]}</p>}
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="message">Mensaje</Label>
              <Textarea id="message" rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} aria-invalid={!!errors.message} />
              {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
            </div>
            <Button type="submit" disabled={busy} className="btn-wine w-full rounded-full" size="lg">
              {busy ? "Enviando…" : "Enviar mensaje"}
            </Button>
          </form>
        )}
      </div>
    </div>
    </div>
  );
}
