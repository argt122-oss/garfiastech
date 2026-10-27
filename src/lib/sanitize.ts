import DOMPurify from "dompurify";

let hooked = false;

/** Browser-only DOMPurify sanitize allowing YouTube embeds. */
export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return "";
  if (!hooked) {
    DOMPurify.addHook("uponSanitizeElement", (node, data) => {
      if (data.tagName === "iframe") {
        const src = (node as Element).getAttribute("src") ?? "";
        if (!/^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//.test(src)) node.parentNode?.removeChild(node);
      }
    });
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "A") {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    });
    hooked = true;
  }
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allowfullscreen", "frameborder", "allow", "target"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|\/api\/public\/media\/|#)/i,
  });
}
