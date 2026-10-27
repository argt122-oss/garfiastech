import { queryOptions } from "@tanstack/react-query";
import { getAboutData, getAppsData, getHomeData, getPageBySlug, getSiteShell } from "./public.functions";

export const shellQuery = queryOptions({ queryKey: ["public", "shell"], queryFn: () => getSiteShell(), staleTime: 30_000 });
export const homeQuery = queryOptions({ queryKey: ["public", "home"], queryFn: () => getHomeData(), staleTime: 30_000 });
export const aboutQuery = queryOptions({ queryKey: ["public", "about"], queryFn: () => getAboutData(), staleTime: 30_000 });
export const appsQuery = queryOptions({ queryKey: ["public", "apps"], queryFn: () => getAppsData(), staleTime: 30_000 });
export const pageQuery = (slug: string) =>
  queryOptions({ queryKey: ["public", "page", slug], queryFn: () => getPageBySlug({ data: { slug } }), staleTime: 30_000 });

export function whatsappLink(num?: string | null) {
  if (!num) return null;
  const digits = num.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}
