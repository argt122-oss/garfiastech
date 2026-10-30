import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, useUnsavedWarning } from "@/components/admin/common";
import { RichEditor } from "@/components/admin/RichEditor";
import { SanitizedHtml } from "@/components/site/SanitizedHtml";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { pageSlugSchema, slugify } from "@/lib/validation";
import { sanitizeHtml } from "@/lib/sanitize";

export const Route = createFileRoute("/admin/pages/$id")({ component: PageEditor });

type P = { title: string; slug: string; content: string; is_published: boolean; show_in_menu: boolean; menu_order: number; seo_description: string };
const blank: P = { title: "", slug: "", content: "", is_published: false, show_in_menu: false, menu_order: 0, seo_description: "" };

function PageEditor() {
  const { id } = Route.useParams();
  const isNew = id === "nueva";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const draftKey = `page-draft-${id}`;
  const [p, setP] = useState<P>(blank);
  const [orig, setOrig] = useState<P>(blank);
  const [loading, setLoading] = useState(!isNew);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      let base = blank;
      if (!isNew) {
        const { data, error } = await supabase.from("pages").select("*").eq("id", id).maybeSingle();
        if (error || !data) {
          toast.error("Página no encontrada");
          return navigate({ to: "/admin/pages" });
        }
        base = { ...data, seo_description: data.seo_description ?? "" };
      }
      setOrig(base);
      const saved = localStorage.getItem(draftKey);
      if (saved && window.confirm("Hay un borrador sin guardar de esta página. ¿Quieres recuperarlo?")) setP(JSON.parse(saved));
      else {
        localStorage.removeItem(draftKey);
        setP(base);
      }
      setLoading(false);
      loaded.current = true;
    })();
  }, [id]);

  const dirty = JSON.stringify(p) !== JSON.stringify(orig);
  useUnsavedWarning(dirty && !saving);

  // Autosave draft locally
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => (dirty ? localStorage.setItem(draftKey, JSON.stringify(p)) : localStorage.removeItem(draftKey)), 800);
    return () => clearTimeout(t);
  }, [p, dirty]);

  async function save() {
    if (!p.title.trim()) return setError("El título es obligatorio");
    const slugRes = pageSlugSchema.safeParse(p.slug);
    if (!slugRes.success) return setError(slugRes.error.issues[0].message);
    setError(null);
    setSaving(true);
    const payload = { ...p, title: p.title.trim(), content: sanitizeHtml(p.content), seo_description: p.seo_description || null };
    const res = isNew ? await supabase.from("pages").insert(payload).select("id").single() : await supabase.from("pages").update(payload).eq("id", id).select("id").single();
    setSaving(false);
    if (res.error) {
      if (res.error.code === "23505") return setError("Ese slug ya está en uso");
      return toast.error("No se pudo guardar");
    }
    localStorage.removeItem(draftKey);
    setOrig(p);
    qc.invalidateQueries();
    toast.success("Página guardada");
    if (isNew) navigate({ to: "/admin/pages/$id", params: { id: res.data.id }, replace: true });
  }

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;

  return (
    <>
      <PageTitle title={isNew ? "Nueva página" : "Editar página"}>
        <Button variant="outline" onClick={() => setPreview(true)}>
          Vista previa
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </PageTitle>
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Input
            placeholder="Título"
            className="text-lg font-semibold"
            value={p.title}
            onChange={(e) => setP({ ...p, title: e.target.value, slug: slugTouched ? p.slug : slugify(e.target.value) })}
          />
          <RichEditor value={p.content} onChange={(content) => setP((x) => ({ ...x, content }))} />
        </div>
        <Panel className="h-fit space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Dirección (slug)</Label>
            <Input id="slug" value={p.slug} onChange={(e) => (setSlugTouched(true), setP({ ...p, slug: e.target.value.toLowerCase() }))} />
            <p className="text-xs text-muted-foreground">/{p.slug || "…"}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seo">Descripción SEO</Label>
            <Input id="seo" maxLength={160} value={p.seo_description} onChange={(e) => setP({ ...p, seo_description: e.target.value })} />
          </div>
          <label className="flex items-center justify-between text-sm">
            Publicada <Switch checked={p.is_published} onCheckedChange={(v) => setP({ ...p, is_published: v })} />
          </label>
          <label className="flex items-center justify-between text-sm">
            Mostrar en el menú <Switch checked={p.show_in_menu} onCheckedChange={(v) => setP({ ...p, show_in_menu: v })} />
          </label>
          <div className="space-y-2">
            <Label htmlFor="mo">Orden en el menú</Label>
            <Input id="mo" type="number" value={p.menu_order} onChange={(e) => setP({ ...p, menu_order: Number(e.target.value) || 0 })} />
          </div>
          {dirty && <p className="text-xs text-muted-foreground">Borrador guardado automáticamente en este navegador.</p>}
        </Panel>
      </div>
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{p.title || "Sin título"}</DialogTitle>
          </DialogHeader>
          <SanitizedHtml html={p.content} className="prose-content" />
        </DialogContent>
      </Dialog>
    </>
  );
}
