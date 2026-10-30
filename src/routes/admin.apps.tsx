import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Pencil, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ConfirmDelete, ImageField, PageTitle, SortableList, saveOrder, useUnsavedWarning } from "@/components/admin/common";
import { AppCard } from "@/components/site/AppCard";
import { SmartImage } from "@/components/site/SmartImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchLinkMetadata } from "@/lib/admin.functions";
import { deleteImage } from "@/lib/media";
import { isHttpUrl } from "@/lib/validation";
import { createCategory } from "./admin.categories";

export const Route = createFileRoute("/admin/apps")({ component: AdminApps });

type App = Tables<"apps">;
type Draft = Omit<App, "id" | "created_at" | "updated_at"> & { id?: string };

const empty = (order: number): Draft => ({
  name: "",
  short_description: "",
  long_description: "",
  url: "",
  image_url: null,
  category_id: null,
  tags: [],
  is_featured: false,
  is_visible: true,
  sort_order: order,
});

function AdminApps() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "apps"],
    queryFn: async () => {
      const [a, c] = await Promise.all([supabase.from("apps").select("*").order("sort_order"), supabase.from("categories").select("*").order("sort_order")]);
      if (a.error) throw a.error;
      return { apps: a.data, cats: c.data ?? [] };
    },
  });
  const [items, setItems] = useState<App[]>([]);
  useEffect(() => setItems(data?.apps ?? []), [data]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const catName = (id: string | null) => data?.cats.find((c) => c.id === id)?.name ?? "Sin categoría";

  async function toggle(a: App, field: "is_visible" | "is_featured", v: boolean) {
    setItems((list) => list.map((x) => (x.id === a.id ? { ...x, [field]: v } : x)));
    const { error } = await supabase.from("apps").update({ [field]: v }).eq("id", a.id);
    if (error) toast.error("No se pudo actualizar");
    refresh();
  }
  async function remove(a: App) {
    const { error } = await supabase.from("apps").delete().eq("id", a.id);
    if (error) return toast.error("No se pudo eliminar");
    await deleteImage(a.image_url);
    toast.success("App eliminada");
    refresh();
  }

  return (
    <>
      <PageTitle title="Apps">
        <Button onClick={() => setEditing(empty(items.length + 1))}>
          <Plus className="mr-1 h-4 w-4" /> Añadir app
        </Button>
      </PageTitle>
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">Aún no hay apps.</p>
      ) : (
        <SortableList
          items={items}
          onReorder={(n) => {
            setItems(n);
            saveOrder("apps", n.map((i) => i.id));
          }}
          render={(a, handle) => (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-2 sm:flex-nowrap">
              {handle}
              <SmartImage src={a.image_url} alt={a.name} className="aspect-video w-20 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{catName(a.category_id)}</p>
              </div>
              <label className="flex items-center gap-1.5 text-xs">
                <Switch checked={a.is_visible} onCheckedChange={(v) => toggle(a, "is_visible", v)} /> Visible
              </label>
              <label className="flex items-center gap-1.5 text-xs">
                <Switch checked={a.is_featured} onCheckedChange={(v) => toggle(a, "is_featured", v)} /> Destacada
              </label>
              <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEditing({ ...a })}>
                <Pencil className="h-4 w-4" />
              </Button>
              <ConfirmDelete onConfirm={() => remove(a)} description="Se eliminará la app y su imagen." />
            </div>
          )}
        />
      )}
      {editing && (
        <AppEditor
          initial={editing}
          cats={data?.cats ?? []}
          allApps={items}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </>
  );
}

function AppEditor({
  initial,
  cats,
  allApps,
  onClose,
  onSaved,
}: {
  initial: Draft;
  cats: Tables<"categories">[];
  allApps: App[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const fetchMeta = useServerFn(fetchLinkMetadata);
  const [d, setD] = useState<Draft>(initial);
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState<string | null>(null);
  const [localCats, setLocalCats] = useState(cats);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(d) !== JSON.stringify(initial);
  useUnsavedWarning(dirty && !saving);

  const duplicate = useMemo(() => {
    const u = (d.url ?? "").trim().replace(/\/$/, "");
    return u && allApps.some((a) => a.id !== d.id && (a.url ?? "").replace(/\/$/, "") === u);
  }, [d.url, d.id, allApps]);

  async function autoFill(url: string) {
    if (!isHttpUrl(url)) return;
    setFetching(true);
    try {
      const res = await fetchMeta({ data: { url } });
      if (!res.ok) return toast.warning(res.error);
      setD((p) => ({
        ...p,
        name: p.name || res.meta.title,
        short_description: p.short_description || res.meta.description,
        image_url: p.image_url || res.meta.image,
      }));
      toast.success("Datos obtenidos del enlace");
    } catch {
      toast.warning("No pude obtener los datos automáticamente, complétalos a mano.");
    } finally {
      setFetching(false);
    }
  }

  async function addCat() {
    if (!newCat?.trim()) return;
    const { data, error } = await createCategory(newCat, localCats.length + 1);
    if (error || !data) return toast.error("No se pudo crear la categoría");
    setLocalCats([...localCats, data]);
    setD({ ...d, category_id: data.id });
    setNewCat(null);
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  async function save() {
    const errs: Record<string, string> = {};
    if (!d.name.trim()) errs.name = "El nombre es obligatorio";
    if (d.url && !isHttpUrl(d.url)) errs.url = "URL no válida (http/https)";
    if (d.image_url && !d.image_url.startsWith("/api/public/media/") && !isHttpUrl(d.image_url)) errs.image = "Imagen no válida";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const payload = {
      ...d,
      name: d.name.trim().slice(0, 120),
      short_description: d.short_description.trim().slice(0, 300),
      url: d.url?.trim() || null,
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20),
    };
    const { id, ...rest } = payload;
    const res = id ? await supabase.from("apps").update(rest).eq("id", id) : await supabase.from("apps").insert(rest);
    setSaving(false);
    if (res.error) return toast.error("No se pudo guardar: " + res.error.message);
    if (id && initial.image_url && initial.image_url !== d.image_url) await deleteImage(initial.image_url);
    qc.invalidateQueries({ queryKey: ["public"] });
    toast.success("App guardada");
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && (!dirty || confirm("¿Descartar los cambios?")) && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{d.id ? "Editar app" : "Añadir app"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Link de la app</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  placeholder="https://…"
                  value={d.url ?? ""}
                  onChange={(e) => setD({ ...d, url: e.target.value })}
                  onPaste={(e) => {
                    const t = e.clipboardData.getData("text").trim();
                    setTimeout(() => autoFill(t), 0);
                  }}
                />
                <Button type="button" variant="outline" disabled={fetching || !isHttpUrl(d.url ?? "")} onClick={() => autoFill(d.url ?? "")}>
                  {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Obtener"}
                </Button>
              </div>
              {errors.url && <p className="text-sm text-destructive">{errors.url}</p>}
              {duplicate && <p className="text-sm text-amber-600 dark:text-amber-400">Ya existe otra app con esta URL (posible duplicado).</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={d.name} maxLength={120} onChange={(e) => setD({ ...d, name: e.target.value })} />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sd">Descripción corta</Label>
              <Textarea id="sd" rows={2} maxLength={300} value={d.short_description} onChange={(e) => setD({ ...d, short_description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ld">Descripción larga (opcional)</Label>
              <Textarea id="ld" rows={3} value={d.long_description ?? ""} onChange={(e) => setD({ ...d, long_description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat">Categoría</Label>
              {newCat === null ? (
                <select
                  id="cat"
                  className="w-full rounded-md border border-input bg-background p-2 text-sm"
                  value={d.category_id ?? ""}
                  onChange={(e) => (e.target.value === "__new" ? setNewCat("") : setD({ ...d, category_id: e.target.value || null }))}
                >
                  <option value="">Sin categoría</option>
                  {localCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="__new">+ Crear nueva…</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <Input autoFocus placeholder="Nombre de la categoría" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
                  <Button type="button" onClick={addCat}>
                    Crear
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setNewCat(null)}>
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tags">Etiquetas (separadas por coma)</Label>
                <Input id="tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">Orden</Label>
                <Input id="order" type="number" value={d.sort_order} onChange={(e) => setD({ ...d, sort_order: Number(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={d.is_visible} onCheckedChange={(v) => setD({ ...d, is_visible: v })} /> Visible
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={d.is_featured} onCheckedChange={(v) => setD({ ...d, is_featured: v })} /> Destacada
              </label>
            </div>
          </div>
          <div className="space-y-4">
            <ImageField label="Imagen (16:9)" value={d.image_url} onChange={(u) => setD({ ...d, image_url: u })} folder="apps" aspect={16 / 9} previewClass="hidden" />
            {errors.image && <p className="text-sm text-destructive">{errors.image}</p>}
            <p className="text-sm font-medium">Vista previa</p>
            <div className="pointer-events-none">
              <AppCard
                app={{
                  id: "preview",
                  name: d.name || "Nombre de la app",
                  short_description: d.short_description || "Descripción corta",
                  url: d.url,
                  image_url: d.image_url,
                  categoryName: localCats.find((c) => c.id === d.category_id)?.name,
                }}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
