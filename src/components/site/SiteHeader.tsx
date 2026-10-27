import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { shellQuery } from "@/lib/queries";
import { ThemeToggle } from "./ThemeToggle";

const linkCls =
  "rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const activeCls = "text-foreground bg-accent";

export function SiteHeader() {
  const { data } = useSuspenseQuery(shellQuery);
  const [open, setOpen] = useState(false);
  const name = data.settings?.logo_text || data.settings?.hero_title || "Inicio";
  const items = [
    { to: "/", label: "Inicio" },
    { to: "/sobre-mi", label: "Sobre mí" },
    { to: "/apps", label: "Apps" },
    { to: "/contacto", label: "Contacto" },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5" aria-label="Principal">
        <Link to="/" className="font-display text-base font-semibold tracking-tight" onClick={() => setOpen(false)}>
          {name}
          <span className="text-primary">.</span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {items.map((i) => (
            <Link key={i.to} to={i.to} className={linkCls} activeProps={{ className: activeCls }} activeOptions={{ exact: i.to === "/" }}>
              {i.label}
            </Link>
          ))}
          {data.menuPages.map((p) => (
            <Link key={p.id} to="/$slug" params={{ slug: p.slug }} className={linkCls} activeProps={{ className: activeCls }}>
              {p.title}
            </Link>
          ))}
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="border-t border-border/60 bg-background px-5 py-3 md:hidden animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col gap-1">
            {items.map((i) => (
              <Link key={i.to} to={i.to} onClick={() => setOpen(false)} className={linkCls + " py-2.5"} activeProps={{ className: activeCls }} activeOptions={{ exact: i.to === "/" }}>
                {i.label}
              </Link>
            ))}
            {data.menuPages.map((p) => (
              <Link key={p.id} to="/$slug" params={{ slug: p.slug }} onClick={() => setOpen(false)} className={linkCls + " py-2.5"} activeProps={{ className: activeCls }}>
                {p.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
