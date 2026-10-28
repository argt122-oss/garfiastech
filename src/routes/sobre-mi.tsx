import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { aboutQuery, shellQuery } from "@/lib/queries";
import { SmartImage } from "@/components/site/SmartImage";
import { Reveal } from "@/components/site/Reveal";
import { SanitizedHtml } from "@/components/site/SanitizedHtml";

export const Route = createFileRoute("/sobre-mi")({
  loader: ({ context }) => context.queryClient.ensureQueryData(aboutQuery),
  head: () => ({
    meta: [
      { title: "Sobre mí — Arturo Garfias Tambo" },
      { name: "description", content: "Trayectoria, experiencia y habilidades de Arturo Garfias Tambo." },
      { property: "og:title", content: "Sobre mí — Arturo Garfias Tambo" },
      { property: "og:description", content: "Trayectoria, experiencia y habilidades de Arturo Garfias Tambo." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  pendingComponent: () => <div className="mx-auto h-96 max-w-6xl animate-pulse px-5 py-20" />,
  component: About,
});

const fmt = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("es", { month: "short", year: "numeric" }) : "");

function About() {
  const { data: shell } = useSuspenseQuery(shellQuery);
  const { data } = useSuspenseQuery(aboutQuery);
  const s = shell.settings;
  const [lb, setLb] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <section className="grid gap-12 md:grid-cols-[1fr_1.4fr]">
        <Reveal>
          <SmartImage src={s?.profile_photo_url} alt={`Foto de ${s?.hero_title ?? "perfil"}`} eager className="aspect-[4/5] w-full rounded-3xl border border-border" />
        </Reveal>
        <Reveal delay={100}>
          <h1 className="text-4xl font-bold md:text-5xl">Sobre mí</h1>
          <SanitizedHtml html={s?.bio_long ?? ""} className="prose-content mt-6 text-muted-foreground" />
        </Reveal>
      </section>

      {data.experience.length > 0 && (
        <section className="mt-24">
          <Reveal>
            <h2 className="text-3xl font-bold">Experiencia</h2>
          </Reveal>
          <ol className="mt-10 space-y-8 border-l-2 border-border pl-8">
            {data.experience.map((e, i) => (
              <Reveal key={e.id} delay={i * 60}>
                <li className="relative">
                  <span className="absolute -left-[2.6rem] top-1.5 h-4 w-4 rounded-full border-4 border-background bg-primary" />
                  <p className="text-sm font-medium text-primary">
                    {e.start_date ? `${fmt(e.start_date)} — ${e.end_date ? fmt(e.end_date) : "Presente"}` : e.end_date ? fmt(e.end_date) : ""}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">{e.role}</h3>
                  {e.company && <p className="text-muted-foreground">{e.company}</p>}
                  {e.description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{e.description}</p>}
                </li>
              </Reveal>
            ))}
          </ol>
        </section>
      )}

      {data.skills.length > 0 && (
        <section className="mt-24">
          <Reveal>
            <h2 className="text-3xl font-bold">Habilidades</h2>
            <ul className="mt-8 flex flex-wrap gap-2">
              {data.skills.map((sk) => (
                <li key={sk.id} className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium">
                  {sk.name}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      )}

      {data.gallery.length > 0 && (
        <section className="mt-24">
          <Reveal>
            <h2 className="text-3xl font-bold">Galería</h2>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
            {data.gallery.map((g, i) => (
              <button
                key={g.id}
                onClick={() => setLb(i)}
                className="overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Ampliar foto${g.caption ? `: ${g.caption}` : ""}`}
              >
                <SmartImage src={g.image_url} alt={g.caption || "Foto de la galería"} className="aspect-square w-full transition-transform duration-500 hover:scale-105" />
              </button>
            ))}
          </div>
        </section>
      )}
      {lb !== null && <Lightbox items={data.gallery} index={lb} onChange={setLb} />}
    </div>
  );
}

function Lightbox({ items, index, onChange }: { items: { image_url: string; caption: string | null }[]; index: number; onChange: (i: number | null) => void }) {
  const prev = useCallback(() => onChange((index - 1 + items.length) % items.length), [index, items.length, onChange]);
  const next = useCallback(() => onChange((index + 1) % items.length), [index, items.length, onChange]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChange(null);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onChange]);
  const it = items[index];
  const btn = "absolute inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div role="dialog" aria-modal="true" aria-label="Visor de fotos" className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/85 p-4 animate-in fade-in" onClick={() => onChange(null)}>
      <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <img src={it.image_url} alt={it.caption || "Foto ampliada"} className="max-h-[80vh] w-auto rounded-xl object-contain" />
        {it.caption && <figcaption className="mt-3 text-center text-sm text-background">{it.caption}</figcaption>}
      </figure>
      <button autoFocus className={btn + " right-4 top-4"} onClick={() => onChange(null)} aria-label="Cerrar">
        <X className="h-5 w-5" />
      </button>
      {items.length > 1 && (
        <>
          <button className={btn + " left-4"} onClick={(e) => (e.stopPropagation(), prev())} aria-label="Anterior">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button className={btn + " right-4"} onClick={(e) => (e.stopPropagation(), next())} aria-label="Siguiente">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
