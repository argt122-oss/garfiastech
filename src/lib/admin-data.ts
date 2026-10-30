import { supabase } from "@/integrations/supabase/client";
import { slugify } from "./validation";

export async function createCategory(name: string, order: number) {
  const base = slugify(name) || "categoria";
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const { data } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${i}`;
  }
  return supabase.from("categories").insert({ name: name.trim(), slug, sort_order: order }).select().single();
}
