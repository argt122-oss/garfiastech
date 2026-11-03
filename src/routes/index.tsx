import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { homeQuery, shellQuery } from "@/lib/queries";
import { SmartImage } from "@/components/site/SmartImage";
import { Reveal } from "@/components/site/Reveal";
import { AppCard, AppCardSkeleton } from "@/components/site/AppCard";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  head: () => ({
    meta: [
      { title: "Arturo Garfias Tambo — Ingeniero en Mecatrónica" },
      { name: "description", content: "Tecnología, infraestructura cloud, automatización y gestión de proyectos." },
      { property: "og:title", content: "Arturo Garfias Tambo — Ingeniero en Mecatrónica" },
      { property: "og:description", content: "Tecnología, infraestructura cloud, automatización y gestión de proyectos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  pendingComponent: () => (
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-24 md:grid-cols-3">
      <AppCardSkeleton />
      <AppCardSkeleton />
      <AppCardSkeleton />
    </div>
  ),
  component: Home,
});

const btnWine =
  "btn-wine inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";
const btnGhostDark =
  "inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-navy-foreground transition-all duration-300 hover:border-white/60 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

function Home() {
  const { data: shell } = useSuspenseQuery(shellQuery);
  const { data } = useSuspenseQuery(homeQuery);
  const s = shell.settings;

  return (
    <>
      <section className="hero-navy relative overflow-hidden text-navy-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full border border-white/10"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-24 pt-16 md:grid-cols-[1.2fr_1fr] md:pt-24">
          <Reveal>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-wine/60 bg-wine/25 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-navy-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-wine-foreground" aria-hidden />
              Portafolio
            </p>
            <h1 className="text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">{s?.hero_title}</h1>
            <p className="mt-6 max-w-xl text-lg text-navy-foreground/80">{s?.hero_subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/apps" className={btnWine}>
                Ver mis apps <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/contacto" className={btnGhostDark}>
                Contáctame
              </Link>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative">
              <div className="absolute -inset-4 -z-0 rounded-[2rem] bg-gradient-to-tr from-wine/40 to-white/5 blur-2xl" aria-hidden />
              <SmartImage
                src={s?.hero_image_url}
                alt={`Foto de ${s?.hero_title ?? "perfil"}`}
                eager
                className="relative aspect-[4/5] w-full rounded-3xl border border-white/15 shadow-lift"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {data.featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <Reveal className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-wine">Proyectos</p>
              <h2 className="text-3xl font-bold">Apps destacadas</h2>
            </div>
            <Link to="/apps" className="text-sm font-semibold text-primary hover:underline">
              Ver todas →
            </Link>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.featured.map((a, i) => (
              <Reveal key={a.id} delay={i * 80}>
                <AppCard app={{ ...a, categoryName: (a.categories as { name: string } | null)?.name }} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="bg-muted/70 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="grid items-center gap-10 rounded-3xl border border-border bg-card p-8 shadow-soft md:grid-cols-[200px_1fr] md:p-12">
            <SmartImage
              src={s?.profile_photo_url}
              alt={`Foto de perfil de ${s?.hero_title ?? ""}`}
              className="aspect-square w-40 rounded-full ring-4 ring-wine-soft md:w-full"
            />
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-wine">Perfil</p>
              <h2 className="text-2xl font-bold">Sobre mí</h2>
              <p className="mt-4 text-muted-foreground">{s?.bio_short}</p>
              <Link to="/sobre-mi" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Conocer más <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 pt-16">
        <Reveal className="hero-navy relative overflow-hidden rounded-3xl px-8 py-14 text-center text-navy-foreground shadow-lift md:px-16">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/10" />
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-navy-foreground/70">Contacto</p>
          <h2 className="text-3xl font-bold">¿Hablamos?</h2>
          <p className="mx-auto mt-3 max-w-lg text-navy-foreground/80">Si tienes un proyecto o una idea, escríbeme y conversemos.</p>
          <Link to="/contacto" className={btnWine + " mt-8"}>
            Contáctame
          </Link>
        </Reveal>
      </section>
    </>
  );
}
