import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";

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

  it("resolves Netlify builds without the competing Nitro adapter", () => {
    execFileSync("node", ["--input-type=module", "-e", `
      import { resolveConfig } from 'vite';
      import { resolve } from 'node:path';
      import assert from 'node:assert/strict';
      const config = await resolveConfig({ configFile: resolve('vite.config.ts') }, 'build');
      const names = config.plugins.map(plugin => plugin.name);
      assert(names.includes('vite-plugin-netlify:build'));
      assert.deepEqual(names.filter(name => /nitro/i.test(name)), []);
      assert.equal(resolve(config.root, config.environments.client?.build.outDir ?? ''), resolve('dist/client'));
    `], { cwd: process.cwd(), env: { ...process.env, NETLIFY: "true" }, stdio: "pipe" });
  }, 30000);
});