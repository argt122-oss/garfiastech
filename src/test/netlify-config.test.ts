import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveConfig } from "vite";

const config = readFileSync(resolve(process.cwd(), "netlify.toml"), "utf8");
const omittedKeys = config.match(/^\s*SECRETS_SCAN_OMIT_KEYS\s*=\s*"([^"]*)"/m)?.[1]?.split(",") ?? [];

describe("Netlify public environment configuration", () => {
  it("exempts only the public URL and publishable-key pairs", () => {
    expect(omittedKeys.sort()).toEqual([
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_URL",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "VITE_SUPABASE_URL",
    ]);
  });

  it("keeps service-role keys and other private variables under scanning", () => {
    expect(omittedKeys).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(omittedKeys).not.toContain("ADMIN_EMAIL");
    expect(config).not.toMatch(/^\s*SECRETS_SCAN_ENABLED\s*=\s*"?false"?\s*$/m);
    expect(config).not.toMatch(/^\s*SECRETS_SCAN_OMIT_PATHS\s*=/m);
  });

  it("keeps the documented public output and plugin-managed SSR functions", () => {
    expect(config).toMatch(/^\s*publish\s*=\s*"dist\/client"\s*$/m);
    expect(config).not.toMatch(/^\s*functions\s*=/m);
  });

  it("resolves Netlify builds without the competing Nitro adapter", async () => {
    const originalNetlify = process.env.NETLIFY;
    try {
      process.env.NETLIFY = "true";
      const resolved = await resolveConfig({ configFile: resolve(process.cwd(), "vite.config.ts") }, "build");
      expect(resolved.plugins.map((plugin) => plugin.name)).toContain("vite-plugin-netlify:build");
      expect(resolved.plugins.map((plugin) => plugin.name).filter((name) => /nitro/i.test(name))).toEqual([]);
      expect(resolve(resolved.root, resolved.environments.client?.build.outDir ?? "")).toBe(resolve(process.cwd(), "dist/client"));
    } finally {
      if (originalNetlify === undefined) delete process.env.NETLIFY;
      else process.env.NETLIFY = originalNetlify;
    }
  }, 30000);
});