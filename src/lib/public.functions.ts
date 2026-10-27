import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { contactSchema } from "./validation";

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) {
    console.error(res.error);
    throw new Error("No se pudo conectar con la base de datos");
  }
  return res.data;
}

export const getSiteShell = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [settings, pages] = await Promise.all([
    sb.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    sb.from("pages").select("id,title,slug,menu_order").eq("show_in_menu", true).order("menu_order"),
  ]);
  return { settings: check(settings), menuPages: check(pages) ?? [] };
});

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const apps = await sb
    .from("apps")
    .select("id,name,short_description,url,image_url,categories(name,slug)")
    .eq("is_featured", true)
    .order("sort_order")
    .limit(3);
  return { featured: check(apps) ?? [] };
});

export const getAboutData = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [exp, skills, gallery] = await Promise.all([
    sb.from("experience").select("*").order("sort_order"),
    sb.from("skills").select("id,name").order("sort_order"),
    sb.from("gallery").select("id,image_url,caption").order("sort_order"),
  ]);
  return { experience: check(exp) ?? [], skills: check(skills) ?? [], gallery: check(gallery) ?? [] };
});

export const getAppsData = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [apps, cats] = await Promise.all([
    sb.from("apps").select("id,name,short_description,url,image_url,category_id,tags").order("sort_order"),
    sb.from("categories").select("id,name,slug").order("sort_order"),
  ]);
  return { apps: check(apps) ?? [], categories: check(cats) ?? [] };
});

export const getPageBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: String(d.slug).slice(0, 80) }))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const page = await sb.from("pages").select("title,slug,content,seo_description").eq("slug", data.slug).maybeSingle();
    return check(page);
  });

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => contactSchema.parse(d))
  .handler(async ({ data }) => {
    // Honeypot: bots fill the hidden "website" field. Pretend success.
    if (data.website && data.website.trim() !== "") return { ok: true };
    const sb = publicClient();
    const { error } = await sb.from("messages").insert({ name: data.name, email: data.email, message: data.message });
    if (error) {
      console.error(error);
      return { ok: false, error: "No pudimos enviar tu mensaje. Inténtalo de nuevo." };
    }
    return { ok: true };
  });
