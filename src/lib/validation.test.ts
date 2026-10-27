import { describe, expect, it } from "vitest";
import { isBlockedHost, isHttpUrl, pageSlugSchema, slugify } from "./validation";

describe("validation rules", () => {
  it("blocks private and local hosts", () => {
    for (const h of ["localhost", "127.0.0.1", "10.1.2.3", "192.168.0.10", "169.254.169.254", "172.16.0.1"]) {
      expect(isBlockedHost(h)).toBe(true);
    }
    expect(isBlockedHost("example.com")).toBe(false);
    expect(isBlockedHost("8.8.8.8")).toBe(false);
  });
  it("accepts only http/https urls", () => {
    expect(isHttpUrl("https://a.com")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("ftp://a.com")).toBe(false);
  });
  it("rejects reserved page slugs", () => {
    for (const s of ["admin", "apps", "sobre-mi", "contacto", "login", "api"]) {
      expect(pageSlugSchema.safeParse(s).success).toBe(false);
    }
    expect(pageSlugSchema.safeParse("mi-pagina").success).toBe(true);
    expect(pageSlugSchema.safeParse("con espacio").success).toBe(false);
  });
  it("slugifies spanish titles", () => {
    expect(slugify("Mis Proyectos Año 2026!")).toBe("mis-proyectos-ano-2026");
  });
});
