import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Plus, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ConfirmDelete, ImageField, PageTitle, Panel, SortableList, saveOrder, useUnsavedWarning } from "@/components/admin/common";
import { RichEditor } from "@/components/admin/RichEditor";
import { SmartImage } from "@/components/site/SmartImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSettings } from "@/lib/admin-data";
import { deleteImage, uploadImage, validateImage } from "@/lib/media";
import { sanitizeHtml } from "@/lib/sanitize";

export const Route = createFileRoute("/admin/about")({ component: AboutAdmin });

function AboutAdmin() {
  return (
    <>
      <PageTitle title="Sobre mí" />
      <div className="space-y-6">
        <BioSection />
        <ExperienceSection />
        <SkillsSection />
        <GallerySection />
      </div>
    </>
  );
}

function BioSection() {
  const { data } = useSettings();
  const qc = useQueryClient();
  const [form, setForm] = useState({ bio_short: "", bio_long: "", profile_photo_url: null as string | null, hero_image_url: null as string | null });
  const [orig, setOrig] = useState(form);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!data) return;
    const v = { bio_short: data.bio_short, bio_long: data.bio_long, profile_photo_url: data.profile_photo_url, hero_image_url: data.hero_image_url };
    setForm(v);
    setOrig(v);
  }, [data]);
  const dirty = JSON.stringify(form) !== JSON.stringify(orig);
  useUnsavedWarning(dirty && !saving);
  if (!data) return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("site_settings").update({ ...form, bio_long: sanitizeHtml(form.bio_long) }).eq("id", 1);
    setSaving(false);
    if (error) return toast.error("No se pudo guardar");
    if (orig.profile_photo_url !== form.profile_photo_url) await deleteImage(orig.profile_photo_url);
    if (orig.hero_image_url !== form.hero_image_url) await deleteImage(orig.hero_image_url);
    setOrig(form);
    toast.success("Guardado");
    qc.invalidateQueries();
  }

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Presentación</h2>
        <Button onClick={save} disabled={saving || !dirty}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ImageField label="Foto de perfil" value={form.profile_photo_url} onChange={(u) => setForm({ ...form, profile_photo_url: u })} folder="site" previewClass="aspect-square w-32 rounded-full" />
        <ImageField label="Foto de portada" value={form.hero_image_url} onChange={(u) => setForm({ ...form, hero_image_url: u })} folder="site" previewClass="aspect-[4/5] w-32 rounded-xl" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bs">Bio corta</Label>
        <Textarea id="bs" rows={3} value={form.bio_short} onChange={(e) => setForm({ ...form, bio_short: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Bio larga</Label>
        <RichEditor value={form.bio_long} onChange={(bio_long) => setForm((f) => ({ ...f, bio_long }))} />
      </div>
    </Panel>
  );
}

type Exp = Tables<"experience">;

function ExperienceSection() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "experience"],
    queryFn: async () => (await supabase.from("experience").select("*").order("sort_order")).data ?? [],
  });
  const [items, setItems] = useState<Exp[]>([]);
  useEffect(() => setItems(data ?? []), [data]);
  const [edit, setEdit] = useState<Partial<Exp> | null>(null);
  const [saving, setSaving] = useState(false);
  const refresh = () => qc.invalidateQueries();

  async function save() {
    if (!edit?.role?.trim()) return toast.error("El cargo es obligatorio");
    if (edit.start_date && edit.end_date && edit.end_date < edit.start_date) return toast.error("La fecha de fin no puede ser anterior al inicio");
    setSaving(true);
    const payload = {
      role: edit.role.trim(),
      company: edit.company?.trim() || null,
      start_date: edit.start_date || null,
      end_date: edit.end_date || null,
      description: edit.description?.trim() || null,
      is_visible: edit.is_visible ?? true,
      sort_order: edit.sort_order ?? items.length + 1,
    };
    const res = edit.id ? await supabase.from("experience").update(payload).eq("id", edit.id) : await supabase.from("experience").insert(payload);
    setSaving(false);
    if (res.error) return toast.error("No se pudo guardar");
    toast.success("Experiencia guardada");
    setEdit(null);
    refresh();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("experience").delete().eq("id", id);
    if (error) return toast.error("No se pudo eliminar");
    toast.success("Eliminada");
    refresh();
  }
  const current = !!edit && !edit.end_date;

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Experiencia</h2>
        <Button size="sm" variant="outline" onClick={() => setEdit({ is_visible: true })}>
          <Plus className="mr-1 h-4 w-4" /> Añadir
        </Button>
      </div>
      <SortableList
        items={items}
        onReorder={(n) => (setItems(n), saveOrder("experience", n.map((i) => i.id)))}
        render={(e, handle) => (
          <div className="flex items-center gap-2 rounded-xl border border-border p-2">
            {handle}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{e.role}</p>
              <p className="text-xs text-muted-foreground">
                {e.company || "Sin empresa"} · {e.start_date ?? "sin fecha"} — {e.end_date ?? "Presente"} {!e.is_visible && "· Oculta"}
              </p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEdit(e)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <ConfirmDelete onConfirm={() => remove(e.id)} />
          </div>
        )}
      />
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Editar experiencia" : "Nueva experiencia"}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="role">Cargo</Label>
                <Input id="role" value={edit.role ?? ""} onChange={(e) => setEdit({ ...edit, role: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="co">Empresa / institución</Label>
                <Input id="co" value={edit.company ?? ""} onChange={(e) => setEdit({ ...edit, company: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="sd">Inicio</Label>
                  <Input id="sd" type="date" value={edit.start_date ?? ""} onChange={(e) => setEdit({ ...edit, start_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ed">Fin</Label>
                  <Input id="ed" type="date" disabled={current} value={edit.end_date ?? ""} onChange={(e) => setEdit({ ...edit, end_date: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={current} onCheckedChange={(v) => setEdit({ ...edit, end_date: v ? null : new Date().toISOString().slice(0, 10) })} /> Trabajo actual
              </label>
              <div className="space-y-1">
                <Label htmlFor="desc">Descripción</Label>
                <Textarea id="desc" rows={3} value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={edit.is_visible ?? true} onCheckedChange={(v) => setEdit({ ...edit, is_visible: v })} /> Visible
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

function SkillsSection() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin", "skills"],
    queryFn: async () => (await supabase.from("skills").select("*").order("sort_order")).data ?? [],
  });
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("skills").insert({ name: name.trim().slice(0, 60), sort_order: data.length + 1 });
    setBusy(false);
    if (error) return toast.error("No se pudo añadir");
    setName("");
    qc.invalidateQueries();
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar esta habilidad?")) return;
    const { error } = await supabase.from("skills").delete().eq("id", id);
    if (error) return toast.error("No se pudo eliminar");
    qc.invalidateQueries();
  }
  return (
    <Panel className="space-y-4">
      <h2 className="font-semibold">Habilidades</h2>
      <form onSubmit={add} className="flex gap-2">
        <Input placeholder="Nueva habilidad" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" disabled={busy}>
          Añadir
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {data.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted py-1 pl-3 pr-1 text-sm">
            {s.name}
            <button aria-label={`Eliminar ${s.name}`} onClick={() => remove(s.id)} className="rounded-full p-1 hover:bg-background">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </Panel>
  );
}

type G = Tables<"gallery">;

function GallerySection() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "gallery"],
    queryFn: async () => (await supabase.from("gallery").select("*").order("sort_order")).data ?? [],
  });
  const [items, setItems] = useState<G[]>([]);
  useEffect(() => setItems(data ?? []), [data]);
  const [progress, setProgress] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const refresh = () => qc.invalidateQueries();

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    let done = 0;
    setProgress(0);
    for (const f of list) {
      const err = validateImage(f);
      if (err) {
        toast.error(`${f.name}: ${err}`);
        continue;
      }
      try {
        const url = await uploadImage(f, "gallery");
        await supabase.from("gallery").insert({ image_url: url, sort_order: items.length + done + 1 });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al subir");
      }
      done++;
      setProgress(Math.round((done / list.length) * 100));
    }
    setProgress(null);
    toast.success("Fotos subidas");
    refresh();
  }
  async function update(g: G, patch: Partial<G>) {
    setItems((l) => l.map((x) => (x.id === g.id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("gallery").update(patch).eq("id", g.id);
    if (error) toast.error("No se pudo actualizar");
    refresh();
  }
  async function remove(g: G) {
    const { error } = await supabase.from("gallery").delete().eq("id", g.id);
    if (error) return toast.error("No se pudo eliminar");
    await deleteImage(g.image_url);
    toast.success("Foto eliminada");
    refresh();
  }

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Galería</h2>
        <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" className="hidden" onChange={(e) => (onFiles(e.target.files), (e.target.value = ""))} />
        <Button size="sm" variant="outline" onClick={() => input.current?.click()} disabled={progress !== null}>
          <Upload className="mr-1 h-4 w-4" /> Subir fotos
        </Button>
      </div>
      {progress !== null && <Progress value={progress} />}
      {items.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay fotos.</p>}
      <SortableList
        grid
        items={items}
        onReorder={(n) => (setItems(n), saveOrder("gallery", n.map((i) => i.id)))}
        render={(g, handle) => (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <SmartImage src={g.image_url} alt={g.caption || "Foto"} className={"aspect-square w-full " + (g.is_visible ? "" : "opacity-40")} />
            <div className="space-y-1 p-2">
              <Input defaultValue={g.caption ?? ""} placeholder="Pie de foto" className="h-8 text-xs" onBlur={(e) => e.target.value !== (g.caption ?? "") && update(g, { caption: e.target.value || null })} />
              <div className="flex items-center justify-between">
                {handle}
                <Button variant="ghost" size="icon" aria-label={g.is_visible ? "Ocultar" : "Mostrar"} onClick={() => update(g, { is_visible: !g.is_visible })}>
                  {g.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <ConfirmDelete onConfirm={() => remove(g)} />
              </div>
            </div>
          </div>
        )}
      />
    </Panel>
  );
}
