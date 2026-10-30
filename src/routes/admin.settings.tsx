import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ImageField, PageTitle, Panel, useUnsavedWarning } from "@/components/admin/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { deleteImage } from "@/lib/media";
import { hexColor, isHttpUrl } from "@/lib/validation";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

type S = Tables<"site_settings">;

export function useSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).single();
      if (error) throw error;
      return data;
    },
  });
}

function SettingsPage() {
  const { data, isLoading } = useSettings();
  const qc = useQueryClient();
  const [s, setS] = useState<S | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => data && setS(data), [data]);
  const dirty = !!s && JSON.stringify(s) !== JSON.stringify(data);
  useUnsavedWarning(dirty && !saving);

  if (isLoading || !s) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;

  const f = (k: keyof S) => ({
    id: k,
    value: (s[k] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setS({ ...s, [k]: e.target.value }),
  });

  async function save() {
    if (!s) return;
    const errs: Record<string, string> = {};
    for (const k of ["linkedin", "github", "instagram"] as const) if (s[k] && !isHttpUrl(s[k]!)) errs[k] = "URL no válida (http/https)";
    if (!hexColor.safeParse(s.accent_color).success) errs.accent_color = "Color inválido";
    if (s.email && !/^\S+@\S+\.\S+$/.test(s.email)) errs.email = "Correo no válido";
    setErrors(errs);
    if (Object.keys(errs).length) return toast.error("Revisa los campos marcados");
    setSaving(true);
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = s;
    const clean = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" && !["hero_title", "hero_subtitle", "bio_short", "bio_long", "logo_text"].includes(k) ? null : v]));
    const { error } = await supabase.from("site_settings").update(clean).eq("id", 1);
    setSaving(false);
    if (error) return toast.error("No se pudo guardar");
    for (const k of ["hero_image_url", "profile_photo_url", "favicon_url"] as const) if (data && data[k] !== s[k]) await deleteImage(data[k]);
    toast.success("Ajustes guardados");
    qc.invalidateQueries();
  }

  const field = (k: keyof S, label: string, opts: { area?: boolean; placeholder?: string } = {}) => (
    <div className="space-y-2">
      <Label htmlFor={k}>{label}</Label>
      {opts.area ? <Textarea rows={3} {...f(k)} /> : <Input placeholder={opts.placeholder} {...f(k)} />}
      {errors[k] && <p className="text-sm text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <>
      <PageTitle title="Ajustes del sitio">
        <Button onClick={save} disabled={saving || !dirty}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </PageTitle>
      <div className="space-y-6">
        <Panel className="space-y-4">
          <h2 className="font-semibold">Identidad y portada</h2>
          {field("logo_text", "Logo / nombre en el menú")}
          {field("hero_title", "Título principal")}
          {field("hero_subtitle", "Subtítulo", { area: true })}
          <ImageField label="Foto de portada" value={s.hero_image_url} onChange={(u) => setS({ ...s, hero_image_url: u })} folder="site" previewClass="aspect-[4/5] w-40 rounded-xl" />
          <div className="space-y-2">
            <Label htmlFor="accent">Color de acento</Label>
            <div className="flex items-center gap-3">
              <input id="accent" type="color" value={s.accent_color} onChange={(e) => setS({ ...s, accent_color: e.target.value })} className="h-10 w-16 cursor-pointer rounded border border-input" />
              <Input className="w-32" value={s.accent_color} onChange={(e) => setS({ ...s, accent_color: e.target.value })} />
            </div>
            {errors.accent_color && <p className="text-sm text-destructive">{errors.accent_color}</p>}
          </div>
        </Panel>
        <Panel className="space-y-4">
          <h2 className="font-semibold">Contacto y redes</h2>
          <p className="text-xs text-muted-foreground">Deja vacío cualquier campo para ocultarlo del sitio.</p>
          {field("email", "Correo")}
          {field("whatsapp", "WhatsApp", { placeholder: "+591 ..." })}
          {field("linkedin", "LinkedIn", { placeholder: "https://linkedin.com/in/..." })}
          {field("github", "GitHub", { placeholder: "https://github.com/..." })}
          {field("instagram", "Instagram", { placeholder: "https://instagram.com/..." })}
        </Panel>
        <Panel className="space-y-4">
          <h2 className="font-semibold">SEO</h2>
          {field("seo_title", "Título SEO")}
          {field("seo_description", "Descripción SEO", { area: true })}
          <ImageField label="Favicon" value={s.favicon_url} onChange={(u) => setS({ ...s, favicon_url: u })} folder="site" previewClass="h-16 w-16 rounded-md" />
        </Panel>
      </div>
    </>
  );
}
