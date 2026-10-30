import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDelete, PageTitle, Panel } from "@/components/admin/common";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/pages")({ component: PagesLayout });

function PagesLayout() {
  const match = useMatchRoute();
  if (match({ to: "/admin/pages/$id" })) return <Outlet />;
  return <PagesList />;
}

function PagesList() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "pages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pages").select("id,title,slug,is_published,show_in_menu,menu_order").order("menu_order");
      if (error) throw error;
      return data;
    },
  });
  async function remove(id: string) {
    const { error } = await supabase.from("pages").delete().eq("id", id);
    if (error) return toast.error("No se pudo eliminar");
    toast.success("Página eliminada");
    qc.invalidateQueries();
  }
  return (
    <>
      <PageTitle title="Páginas">
        <Button asChild>
          <Link to="/admin/pages/$id" params={{ id: "nueva" }}>
            <Plus className="mr-1 h-4 w-4" /> Nueva página
          </Link>
        </Button>
      </PageTitle>
      {isLoading && <div className="h-32 animate-pulse rounded-2xl bg-muted" />}
      {!isLoading && data.length === 0 && <Panel>Aún no hay páginas extra.</Panel>}
      <div className="space-y-2">
        {data.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.title}</p>
              <p className="text-xs text-muted-foreground">
                /{p.slug} · {p.is_published ? "Publicada" : "Borrador"}
                {p.show_in_menu ? " · En el menú" : ""}
              </p>
            </div>
            <Button variant="ghost" size="icon" asChild aria-label="Editar">
              <Link to="/admin/pages/$id" params={{ id: p.id }}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <ConfirmDelete onConfirm={() => remove(p.id)} />
          </div>
        ))}
      </div>
    </>
  );
}
