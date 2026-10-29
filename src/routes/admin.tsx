import { useState } from "react";
import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AppWindow, FileText, FolderTree, Home, LogOut, Mail, Menu, Settings, User, X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/admin/login" });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
    if (!isAdmin) {
      await supabase.auth.signOut();
      throw redirect({ to: "/admin/login" });
    }
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Panel de administración" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Inicio", icon: Home, exact: true },
  { to: "/admin/apps", label: "Apps", icon: AppWindow },
  { to: "/admin/categories", label: "Categorías", icon: FolderTree },
  { to: "/admin/pages", label: "Páginas", icon: FileText },
  { to: "/admin/about", label: "Sobre mí", icon: User },
  { to: "/admin/settings", label: "Ajustes", icon: Settings },
  { to: "/admin/messages", label: "Mensajes", icon: Mail },
] as const;

function AdminLayout() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  }

  const links = (
    <nav className="flex flex-col gap-1">
      {nav.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={() => setOpen(false)}
          activeOptions={{ exact: "exact" in n }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          activeProps={{ className: "bg-sidebar-accent text-foreground" }}
        >
          <n.icon className="h-4 w-4" />
          {n.label}
        </Link>
      ))}
      <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent">
        <ExternalLink className="h-4 w-4" /> Ver sitio
      </a>
      <button onClick={signOut} className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-sidebar-accent">
        <LogOut className="h-4 w-4" /> Cerrar sesión
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-muted/30 md:flex">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar p-4 md:block">
        <p className="mb-6 px-3 font-display font-semibold">Panel</p>
        {links}
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
        <p className="font-display font-semibold">Panel</p>
        <button aria-label="Menú" onClick={() => setOpen(!open)} className="p-2">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && <div className={cn("border-b border-border bg-sidebar p-3 md:hidden")}>{links}</div>}
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
