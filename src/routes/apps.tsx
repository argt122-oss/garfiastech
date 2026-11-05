import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { appsQuery } from "@/lib/queries";
import { AppCard, AppCardSkeleton } from "@/components/site/AppCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/apps")({
  validateSearch: (s: Record<string, unknown>): { cat?: string } => ({ cat: typeof s.cat === "string" ? s.cat : undefined }),
  loader: ({ context }) => context.queryClient.ensureQueryData(appsQuery),
  head: () => ({
    meta: [
      { title: "Apps y proyectos — Arturo Garfias Tambo" },
      { name: "description", content: "Aplicaciones y proyectos digitales de Arturo Garfias Tambo." },
      { property: "og:title", content: "Apps y proyectos — Arturo Garfias Tambo" },
      { property: "og:description", content: "Aplicaciones y proyectos digitales de Arturo Garfias Tambo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  pendingComponent: () => (
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-24 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <AppCardSkeleton key={i} />
      ))}
    </div>
  ),
  component: AppsPage,
});

function AppsPage() {
  const { data } = useSuspenseQuery(appsQuery);
  const { cat } = Route.useSearch();
  const navigate = useNavigate({ from: "/apps" });
  const catMap = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
  const tabs = data.categories.filter((c) => data.apps.some((a) => a.category_id === c.id));
  const active = tabs.find((t) => t.slug === cat);
  const list = active ? data.apps.filter((a) => a.category_id === active.id) : data.apps;

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-wine">Proyectos</p>
      <h1 className="text-4xl font-bold md:text-5xl">Apps</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">Proyectos y aplicaciones en los que he trabajado.</p>

      {tabs.length > 0 && (
        <div role="tablist" aria-label="Categorías" className="mt-10 flex gap-2 overflow-x-auto pb-2">
          {[{ slug: undefined as string | undefined, name: "Todas", id: "all" }, ...tabs].map((t) => {
            const isActive = (t.slug ?? undefined) === (active?.slug ?? undefined);
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => navigate({ search: { cat: t.slug }, replace: true, resetScroll: false })}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "border-wine bg-wine text-wine-foreground shadow-soft" : "border-border bg-card text-muted-foreground hover:border-wine/40 hover:text-foreground",
                )}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      )}

      {list.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-border p-16 text-center text-muted-foreground">Pronto habrá apps aquí</div>
      ) : (
        <div key={active?.slug ?? "all"} className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {list.map((a) => (
            <AppCard key={a.id} app={{ ...a, categoryName: a.category_id ? catMap.get(a.category_id)?.name : null }} />
          ))}
        </div>
      )}
    </div>
  );
}
