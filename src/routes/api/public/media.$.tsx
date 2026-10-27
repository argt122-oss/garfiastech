import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Serves images from the private "site-media" bucket. Public read is allowed by
// a storage policy; this route only ever reads, never writes.
export const Route = createFileRoute("/api/public/media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params._splat ?? "").replace(/\.\.+/g, "");
        if (!path || !/^[a-zA-Z0-9/_\-.]+$/.test(path)) return new Response("Not found", { status: 404 });
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const sb = createClient(process.env["SUPABASE_URL"]!, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
              h.set("apikey", key);
              return fetch(input, { ...init, headers: h });
            },
          },
        });
        const { data, error } = await sb.storage.from("site-media").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        const type = data.type || "application/octet-stream";
        return new Response(data, {
          headers: {
            "content-type": type,
            "cache-control": "public, max-age=31536000, immutable",
            "x-content-type-options": "nosniff",
            ...(type.includes("svg") ? { "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" } : {}),
          },
        });
      },
    },
  },
});
