import DOMPurify from "dompurify";

// Detección simple: contenido producido por TipTap empieza con tag HTML.
export function isHtml(s?: string | null): boolean {
  if (!s) return false;
  return /^\s*<(p|h[1-6]|ul|ol|blockquote|div|span|strong|em|u|s|a)\b/i.test(s);
}

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "h1", "h2", "h3", "h4",
  "ul", "ol", "li", "blockquote", "a", "span", "div",
];
const ALLOWED_ATTR = ["href", "target", "rel", "style", "class"];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(https?:|mailto:|tel:|#|\/)/i,
  });
}

// Convierte HTML a texto plano (para listados de posts donde mantenemos
// la coherencia visual: misma fuente, alineación a la izquierda).
export function stripHtmlToText(s?: string | null): string {
  if (!s) return "";
  if (!isHtml(s)) return s;
  if (typeof document === "undefined") return s.replace(/<[^>]+>/g, "");
  const tmp = document.createElement("div");
  tmp.innerHTML = sanitizeHtml(s);
  return (tmp.textContent || tmp.innerText || "").trim();
}
