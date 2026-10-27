import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isBlockedHost, isHttpUrl } from "./validation";

/** Whether the first-access setup screen is still available. */
export const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
  if (!roles || roles.length === 0) return { available: true };
  for (const r of roles) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
    if (data.user?.last_sign_in_at) return { available: false };
  }
  return { available: true };
});

/**
 * First access: only ADMIN_EMAIL can be set up. Instead of accepting a password here
 * (which anyone who knows the address could do), an invitation link is emailed to
 * that address, so only the owner of the mailbox can set the password.
 */
export const startAdminSetup = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().email().max(255) }).parse(d))
  .handler(async ({ data }) => {
    const adminEmail = (process.env["ADMIN_EMAIL"] ?? "").trim().toLowerCase();
    const generic = { ok: true, message: "Si el correo está autorizado, recibirás un enlace para crear tu contraseña." };
    if (!adminEmail) return { ok: false, message: "Falta configurar ADMIN_EMAIL en el servidor." };
    if (data.email.toLowerCase() !== adminEmail) return generic;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
    for (const r of roles ?? []) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      if (u.user?.last_sign_in_at) return { ok: false, message: "La configuración inicial ya fue completada." };
    }

    const origin = new URL(getRequest().url).origin;
    const redirectTo = `${origin}/reset-password`;
    let userId: string | undefined;
    const invite = await supabaseAdmin.auth.admin.inviteUserByEmail(adminEmail, { redirectTo });
    if (invite.error) {
      // User may already exist (e.g. invite resent): send a recovery link instead.
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users.find((u) => u.email?.toLowerCase() === adminEmail);
      if (!existing) {
        console.error(invite.error);
        return { ok: false, message: "No se pudo enviar el correo. Inténtalo más tarde." };
      }
      userId = existing.id;
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(adminEmail, { redirectTo });
      if (error) {
        console.error(error);
        return { ok: false, message: "No se pudo enviar el correo. Inténtalo más tarde." };
      }
    } else {
      userId = invite.data.user?.id;
    }
    if (userId) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    }
    return generic;
  });

type Meta = { title: string; description: string; image: string | null; finalUrl: string };

function pick(html: string, patterns: RegExp[]): string {
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return decode(m[1].trim());
  }
  return "";
}
function decode(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
const metaRe = (attr: string, name: string) => [
  new RegExp(`<meta[^>]+${attr}=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
  new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${name}["']`, "i"),
];

async function safeFetch(start: string, signal: AbortSignal): Promise<{ res: Response; url: string }> {
  let url = start;
  for (let i = 0; i < 5; i++) {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol) || isBlockedHost(u.hostname)) throw new Error("blocked");
    const res = await fetch(url, {
      redirect: "manual",
      signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; PortfolioPreviewBot/1.0)", accept: "text/html" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url).toString();
      continue;
    }
    return { res, url };
  }
  throw new Error("too many redirects");
}

async function readLimited(res: Response, max = 1_000_000): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    chunks.push(value);
    if (total >= max) {
      await reader.cancel();
      break;
    }
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c.subarray(0, Math.min(c.length, total - off)), off);
    off += c.length;
    if (off >= total) break;
  }
  return new TextDecoder().decode(buf);
}

export const fetchLinkMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ url: z.string().trim().max(500) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; meta: Meta } | { ok: false; error: string }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) return { ok: false, error: "No autorizado" };
    if (!isHttpUrl(data.url)) return { ok: false, error: "La URL debe empezar con http:// o https://" };
    if (isBlockedHost(new URL(data.url).hostname)) return { ok: false, error: "Esa dirección no está permitida" };

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const { res, url } = await safeFetch(data.url, ctrl.signal);
      const type = res.headers.get("content-type") ?? "";
      const html = type.includes("html") ? await readLimited(res) : "";
      const title =
        pick(html, [...metaRe("property", "og:title"), ...metaRe("name", "twitter:title"), /<title[^>]*>([^<]+)<\/title>/i]) ||
        new URL(url).hostname;
      const description = pick(html, [
        ...metaRe("property", "og:description"),
        ...metaRe("name", "twitter:description"),
        ...metaRe("name", "description"),
      ]);
      let image = pick(html, [...metaRe("property", "og:image"), ...metaRe("name", "twitter:image")]) || null;
      if (image) {
        try {
          image = new URL(image, url).toString();
          if (!isHttpUrl(image)) image = null;
        } catch {
          image = null;
        }
      }
      if (!image) image = `https://image.thum.io/get/width/1200/crop/675/${url}`;
      return { ok: true, meta: { title: title.slice(0, 120), description: description.slice(0, 300), image, finalUrl: url } };
    } catch (e) {
      console.error("metadata fetch failed", e);
      return { ok: false, error: "No pude obtener los datos automáticamente, complétalos a mano." };
    } finally {
      clearTimeout(timer);
    }
  });
