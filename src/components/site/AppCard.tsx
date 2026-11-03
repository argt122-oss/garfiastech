import { ArrowUpRight } from "lucide-react";
import { SmartImage } from "./SmartImage";
import { isHttpUrl } from "@/lib/validation";

export type AppCardData = {
  id: string;
  name: string;
  short_description: string;
  url: string | null;
  image_url: string | null;
  categoryName?: string | null;
};

export function AppCard({ app }: { app: AppCardData }) {
  const href = app.url && isHttpUrl(app.url) ? app.url : undefined;
  const Tag = href ? "a" : "div";
  return (
    <Tag
      {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-wine/40 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={href ? `${app.name} (se abre en una pestaña nueva)` : app.name}
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        <SmartImage src={app.image_url} alt={`Vista previa de ${app.name}`} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-navy-deep/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
        {href && (
          <span className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-wine text-wine-foreground opacity-0 shadow-soft transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {app.categoryName && <span className="w-fit rounded-full bg-wine-soft px-2.5 py-0.5 text-xs font-medium text-wine">{app.categoryName}</span>}
        <h3 className="text-lg font-semibold transition-colors duration-300 group-hover:text-primary">{app.name}</h3>
        <p className="line-clamp-3 text-sm text-muted-foreground">{app.short_description}</p>
      </div>
      <span className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-navy to-wine transition-transform duration-300 group-hover:scale-x-100" aria-hidden />
    </Tag>
  );
}

export function AppCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-video animate-pulse bg-muted" />
      <div className="space-y-2 p-5">
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
