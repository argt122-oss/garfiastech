import { Github, Instagram, Linkedin, Mail, MessageCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { whatsappLink } from "@/lib/queries";
import { isHttpUrl } from "@/lib/validation";

export function SocialLinks({ settings, className = "" }: { settings: Tables<"site_settings"> | null; className?: string }) {
  if (!settings) return null;
  const links = [
    settings.email && { href: `mailto:${settings.email}`, label: "Correo", icon: Mail },
    whatsappLink(settings.whatsapp) && { href: whatsappLink(settings.whatsapp)!, label: "WhatsApp", icon: MessageCircle },
    settings.linkedin && isHttpUrl(settings.linkedin) && { href: settings.linkedin, label: "LinkedIn", icon: Linkedin },
    settings.github && isHttpUrl(settings.github) && { href: settings.github, label: "GitHub", icon: Github },
    settings.instagram && isHttpUrl(settings.instagram) && { href: settings.instagram, label: "Instagram", icon: Instagram },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Mail }[];
  return (
    <div className={"flex flex-wrap gap-2 " + className}>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target={l.href.startsWith("mailto:") ? undefined : "_blank"}
          rel="noopener noreferrer"
          aria-label={l.label}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <l.icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}
