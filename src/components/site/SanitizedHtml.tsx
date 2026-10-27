import { useEffect, useState } from "react";
import { sanitizeHtml } from "@/lib/sanitize";

/**
 * Renders rich text. HTML is sanitized in the browser with DOMPurify before saving
 * (admin only) and again here after hydration; SSR uses a strict tag-stripping fallback.
 */
export function SanitizedHtml({ html, className }: { html: string; className?: string }) {
  const [clean, setClean] = useState(() => basicStrip(html));
  useEffect(() => {
    setClean(sanitizeHtml(html));
  }, [html]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}

function basicStrip(html: string) {
  return html
    .replace(/<(script|style|object|embed|form)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|object|embed|form)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "")
    .replace(/<iframe(?![^>]*src=["']https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/)[^>]*>[\s\S]*?<\/iframe>/gi, "");
}
