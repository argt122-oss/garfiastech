import { z } from "zod";

export const RESERVED_SLUGS = ["admin", "apps", "sobre-mi", "contacto", "login", "api", "reset-password"];

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export const optionalUrl = z
  .string()
  .trim()
  .max(500, "La URL es demasiado larga")
  .refine((v) => v === "" || isHttpUrl(v), "Ingresa una URL válida que empiece con http:// o https://");

export const slugSchema = z
  .string()
  .trim()
  .min(1, "El slug es obligatorio")
  .max(80, "Máximo 80 caracteres")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones (sin espacios)");

export const pageSlugSchema = slugSchema.refine((v) => !RESERVED_SLUGS.includes(v), "Este slug está reservado por el sitio");

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido");

export function safeHex(value: string | null | undefined, fallback = "#2563eb"): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Escribe tu nombre").max(120, "Máximo 120 caracteres"),
  email: z.string().trim().email("Correo no válido").max(255),
  message: z.string().trim().min(10, "El mensaje debe tener al menos 10 caracteres").max(5000, "Máximo 5000 caracteres"),
  website: z.string().optional(),
});

/** Blocks hostnames that point at the local machine or private networks (SSRF guard). */
export function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h === "0.0.0.0" || h === "::" || h === "::1") return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (h.includes(":")) {
    if (h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80") || h.startsWith("::ffff:")) return true;
  }
  if (/^\d+$/.test(h)) return true; // decimal IP form
  return false;
}
