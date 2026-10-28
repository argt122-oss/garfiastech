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

const btnPrimary =
  "inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const btnGhost =
  "inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Home() {
  const { data: shell } = useSuspenseQuery(shellQuery);
  const { data } = useSuspenseQuery(homeQuery);
  const s = shell.settings;

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 md:grid-cols-[1.2fr_1fr] md:pt-24">
        <Reveal>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Portafolio
          </p>
          <h1 className="text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">{s?.hero_title}</h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">{s?.hero_subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/apps" className={btnPrimary}>
              Ver mis apps <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/contacto" className={btnGhost}>
              Contáctame
            </Link>
          </div>
        </Reveal>
        <Reveal delay={150}>
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-primary-soft to-transparent blur-2xl" />
            <SmartImage src={s?.hero_image_url} alt={`Foto de ${s?.hero_title ?? "perfil"}`} eager className="aspect-[4/5] w-full rounded-3xl border border-border" />
          </div>
        </Reveal>
      </section>

      {data.featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <Reveal className="mb-8 flex items-end justify-between gap-4">
            <h2 className="text-3xl font-bold">Apps destacadas</h2>
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

      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal className="grid items-center gap-10 rounded-3xl border border-border bg-card p-8 shadow-soft md:grid-cols-[200px_1fr] md:p-12">
          <SmartImage src={s?.profile_photo_url} alt={`Foto de perfil de ${s?.hero_title ?? ""}`} className="aspect-square w-40 rounded-full md:w-full" />
          <div>
            <h2 className="text-2xl font-bold">Sobre mí</h2>
            <p className="mt-4 text-muted-foreground">{s?.bio_short}</p>
            <Link to="/sobre-mi" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              Conocer más <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 pt-8">
        <Reveal className="rounded-3xl bg-primary px-8 py-14 text-center text-primary-foreground md:px-16">
          <h2 className="text-3xl font-bold">¿Hablamos?</h2>
          <p className="mx-auto mt-3 max-w-lg opacity-90">Si tienes un proyecto o una idea, escríbeme y conversemos.</p>
          <Link to="/contacto" className="mt-8 inline-flex rounded-full bg-background px-6 py-3 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5">
            Contáctame
          </Link>
        </Reveal>
      </section>
    </>
  );
}
