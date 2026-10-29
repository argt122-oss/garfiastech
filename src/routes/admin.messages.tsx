import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDelete, PageTitle, Panel } from "@/components/admin/common";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/messages")({ component: Messages });

function Messages() {
  const qc = useQueryClient();
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["admin", "messages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  async function toggle(id: string, is_read: boolean) {
    const { error } = await supabase.from("messages").update({ is_read }).eq("id", id);
    if (error) toast.error("No se pudo actualizar");
    refresh();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) toast.error("No se pudo eliminar");
    else toast.success("Mensaje eliminado");
    refresh();
  }

  return (
    <>
      <PageTitle title="Mensajes" />
      {isLoading && <div className="h-32 animate-pulse rounded-2xl bg-muted" />}
      {error && <p className="text-destructive">Error al cargar los mensajes.</p>}
      {!isLoading && data.length === 0 && <Panel>No hay mensajes todavía.</Panel>}
      <div className="space-y-3">
        {data.map((m) => (
          <Panel key={m.id} className={cn(!m.is_read && "border-primary")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {!m.is_read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary" />}
                  {m.name}{" "}
                  <a href={`mailto:${m.email}`} className="text-sm font-normal text-primary hover:underline">
                    {m.email}
                  </a>
                </p>
                <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("es")}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => toggle(m.id, !m.is_read)}>
                  {m.is_read ? "Marcar no leído" : "Marcar leído"}
                </Button>
                <ConfirmDelete onConfirm={() => remove(m.id)} />
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm">{m.message}</p>
          </Panel>
        ))}
      </div>
    </>
  );
}
