// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import netlify from "@netlify/vite-plugin-tanstack-start";

const isNetlify = process.env.NETLIFY === "true";

export default defineConfig({
  // Netlify owns its SSR output. Do not also let Nitro relocate the client
  // output or generate a second deployment target during Netlify builds.
  ...(isNetlify ? { nitro: false as const } : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      // Netlify sets NETLIFY=true during its builds; gating keeps the Lovable
      // dev/preview server untouched while Netlify gets its deployment target.
      ...(isNetlify ? [netlify()] : []),
    ],
  },
});
