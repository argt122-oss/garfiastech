import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PageTitle, Panel, SortableList, saveOrder } from "@/components/admin/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createCategory } from "@/lib/admin-data";

export const Route = createFileRoute("/admin/categories")({ component: Categories });

function Categories() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "categories-with-counts"],
    queryFn: async () => {
      const [c, a] = await Promise.all([supabase.from("categories").select("*").order("sort_order"), supabase.from("apps").select("id,category_id")]);
      if (c.error) throw c.error;
      return { cats: c.data, apps: a.data ?? [] };
    },
  });
  const [items, setItems] = useState<Tables<"categories">[]>([]);
  useEffect(() => setItems(data?.cats ?? []), [data]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Tables<"categories"> | null>(null);
  const [moveTo, setMoveTo] = useState<string>("none");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Escribe un nombre");
    setBusy(true);
    const { error } = await createCategory(name, items.length + 1);
    setBusy(false);
    if (error) return toast.error("No se pudo crear la categoría");
    setName("");
    toast.success("Categoría creada");
    refresh();
  }

  async function rename(c: Tables<"categories">, newName: string) {
    if (!newName.trim() || newName === c.name) return;
    const { error } = await supabase.from("categories").update({ name: newName.trim() }).eq("id", c.id);
    if (error) toast.error("No se pudo renombrar");
    else toast.success("Categoría renombrada");
    refresh();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const { error: mErr } = await supabase
      .from("apps")
      .update({ category_id: moveTo === "none" ? null : moveTo })
      .eq("category_id", toDelete.id);
    if (mErr) return toast.error("No se pudieron mover las apps");
    const { error } = await supabase.from("categories").delete().eq("id", toDelete.id);
    if (error) toast.error("No se pudo eliminar");
    else toast.success("Categoría eliminada");
    setToDelete(null);
    refresh();
  }

  const count = (id: string) => data?.apps.filter((a) => a.category_id === id).length ?? 0;

  return (
    <>
      <PageTitle title="Categorías" />
      <Panel className="mb-6">
        <form onSubmit={add} className="flex gap-2">
          <Input placeholder="Nueva categoría" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          <Button type="submit" disabled={busy}>
            Crear
          </Button>
        </form>
      </Panel>
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      ) : (
        <SortableList
          items={items}
          onReorder={(n) => {
            setItems(n);
            saveOrder("categories", n.map((i) => i.id)).then(refresh);
          }}
          render={(c, handle) => (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2">
              {handle}
              <Input defaultValue={c.name} onBlur={(e) => rename(c, e.target.value)} className="border-transparent shadow-none" aria-label="Nombre de la categoría" />
              <span className="shrink-0 text-xs text-muted-foreground">{count(c.id)} apps</span>
              <Button variant="ghost" size="icon" aria-label="Eliminar" onClick={() => (setMoveTo("none"), setToDelete(c))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        />
      )}
      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar “{toDelete?.name}”</DialogTitle>
            <DialogDescription>Las apps de esta categoría no se borran. Elige a dónde moverlas.</DialogDescription>
          </DialogHeader>
          <select className="w-full rounded-md border border-input bg-background p-2 text-sm" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
            <option value="none">Sin categoría</option>
            {items
              .filter((c) => c.id !== toDelete?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Eliminar categoría
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
