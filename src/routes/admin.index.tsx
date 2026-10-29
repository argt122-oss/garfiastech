import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppWindow, FileText, Mail, Plus, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel } from "@/components/admin/common";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "summary"],
    queryFn: async () => {
      const [apps, unread] = await Promise.all([
        supabase.from("apps").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("is_read", false),
      ]);
      return { apps: apps.count ?? 0, unread: unread.count ?? 0 };
    },
  });
  const quick = [
    { to: "/admin/apps", label: "Añadir app", icon: Plus },
    { to: "/admin/pages", label: "Páginas", icon: FileText },
    { to: "/admin/settings", label: "Ajustes del sitio", icon: Settings },
  ] as const;
  return (
    <>
      <PageTitle title="Resumen" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel>
          <AppWindow className="h-5 w-5 text-primary" />
          <p className="mt-3 text-3xl font-bold">{isLoading ? "…" : data?.apps}</p>
          <p className="text-sm text-muted-foreground">Apps</p>
        </Panel>
        <Link to="/admin/messages">
          <Panel className="h-full hover:border-primary">
            <Mail className="h-5 w-5 text-primary" />
            <p className="mt-3 text-3xl font-bold">{isLoading ? "…" : data?.unread}</p>
            <p className="text-sm text-muted-foreground">Mensajes sin leer</p>
          </Panel>
        </Link>
      </div>
      <h2 className="mb-3 mt-8 font-semibold">Accesos rápidos</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {quick.map((q) => (
          <Link key={q.to} to={q.to} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm font-medium hover:border-primary">
            <q.icon className="h-4 w-4 text-primary" /> {q.label}
          </Link>
        ))}
      </div>
    </>
  );
}
