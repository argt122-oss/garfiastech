import { useSuspenseQuery } from "@tanstack/react-query";
import { shellQuery } from "@/lib/queries";
import { SocialLinks } from "./SocialLinks";

export function SiteFooter() {
  const { data } = useSuspenseQuery(shellQuery);
  const s = data.settings;
  return (
    <footer className="bg-navy-deep text-navy-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center">
        <div>
          <p className="font-display font-semibold">
            {s?.hero_title}
            <span className="text-wine-soft">.</span>
          </p>
          {s?.email && (
            <a href={`mailto:${s.email}`} className="text-sm text-navy-foreground/70 transition-colors hover:text-navy-foreground">
              {s.email}
            </a>
          )}
        </div>
        <SocialLinks settings={s} />
      </div>
      <p className="pb-8 text-center text-xs text-navy-foreground/60">© {new Date().getFullYear()} {s?.hero_title}</p>
    </footer>
  );
}
