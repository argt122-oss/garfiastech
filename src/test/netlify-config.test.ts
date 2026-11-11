import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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
});