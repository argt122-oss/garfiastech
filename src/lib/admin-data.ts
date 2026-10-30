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

import { useQuery } from "@tanstack/react-query";
export function useSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).single();
      if (error) throw error;
      return data;
    },
  });
}
