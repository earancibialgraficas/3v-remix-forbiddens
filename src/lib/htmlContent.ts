import DOMPurify from "dompurify";

const HTML_TAG_PATTERN = /<\/?(p|h[1-6]|ul|ol|blockquote|div|span|strong|em|u|s|a|br|li)\b[^>]*>/i;
const ESCAPED_HTML_TAG_PATTERN = /&lt;\/?(p|h[1-6]|ul|ol|blockquote|div|span|strong|em|u|s|a|br|li)\b/i;

export function decodeHtmlEntities(s?: string | null): string {
  if (!s) return "";
  if (typeof document === "undefined") {
    return s
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }
  const textarea = document.createElement("textarea");
  textarea.innerHTML = s;
  return textarea.value;
}

// Detecta contenido producido por TipTap, incluso cuando llega escapado.
export function isHtml(s?: string | null): boolean {
  if (!s) return false;
  return HTML_TAG_PATTERN.test(s) || ESCAPED_HTML_TAG_PATTERN.test(s);
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

// Convierte HTML a texto plano para listados, avisos y carruseles.
export function stripHtmlToText(s?: string | null): string {
  if (!s) return "";
  const decoded = decodeHtmlEntities(s);
  if (!isHtml(decoded)) return decoded.trim();
  if (typeof document === "undefined") return decoded.replace(/<[^>]+>/g, "").trim();
  const tmp = document.createElement("div");
  tmp.innerHTML = sanitizeHtml(decoded);
  return (tmp.textContent || tmp.innerText || "").trim();
}
