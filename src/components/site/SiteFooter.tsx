import { useSuspenseQuery } from "@tanstack/react-query";
import { shellQuery } from "@/lib/queries";
import { SocialLinks } from "./SocialLinks";

export function SiteFooter() {
  const { data } = useSuspenseQuery(shellQuery);
  const s = data.settings;
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center">
        <div>
          <p className="font-display font-semibold">{s?.hero_title}</p>
          {s?.email && (
            <a href={`mailto:${s.email}`} className="text-sm text-muted-foreground hover:text-primary">
              {s.email}
            </a>
          )}
        </div>
        <SocialLinks settings={s} />
      </div>
      <p className="pb-8 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} {s?.hero_title}</p>
    </footer>
  );
}
