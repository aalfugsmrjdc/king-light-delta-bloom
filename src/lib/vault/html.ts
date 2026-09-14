const AMP = "&" + "amp;";
const LT = "&" + "lt;";
const GT = "&" + "gt;";
const QUOT = "&" + "quot;";
const NBSP = "&" + "nbsp;";

export function htmlToPlain(html: string): string {
  if (!html) return "";
  if (typeof document === "undefined") {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(new RegExp(NBSP, "gi"), " ")
      .replace(new RegExp(AMP, "g"), "&")
      .replace(new RegExp(LT, "g"), "<")
      .replace(new RegExp(GT, "g"), ">")
      .replace(/\s+/g, " ")
      .trim();
  }
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}

export function previewOf(html: string, n = 18): string {
  const plain = htmlToPlain(html);
  return plain.length <= n ? plain : `${plain.slice(0, n)}…`;
}

export function byteSize(html: string): number {
  return new TextEncoder().encode(htmlToPlain(html)).length;
}

export function wordStats(html: string): { chars: number; words: number; minutes: number } {
  const plain = htmlToPlain(html);
  const chars = plain.length;
  const words = plain.split(/\s+/).filter(Boolean).length;
  const cjk = (plain.match(/[\u4e00-\u9fff]/g) || []).length;
  const minutes = Math.max(1, Math.round((cjk / 400 + (chars - cjk) / 900) * 10) / 10);
  return { chars, words, minutes };
}

export interface OutlineHeading {
  id: string;
  level: 1 | 2 | 3;
  text: string;
}

export function outlineFromHtml(html: string): OutlineHeading[] {
  if (typeof document === "undefined" || !html) return [];
  const el = document.createElement("div");
  el.innerHTML = html;
  const nodes = el.querySelectorAll("h1, h2, h3");
  return Array.from(nodes).map((node, i) => ({
    id: `h-${i}`,
    level: Number(node.tagName[1]) as 1 | 2 | 3,
    text: (node.textContent || "").trim() || "无标题",
  }));
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, AMP)
    .replace(/</g, LT)
    .replace(/>/g, GT)
    .replace(/"/g, QUOT);
}

export function wrapParagraphs(text: string): string {
  const parts = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return parts
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function decodeXmlEntities(s: string): string {
  return s
    .replace(new RegExp(AMP, "g"), "&")
    .replace(new RegExp(LT, "g"), "<")
    .replace(new RegExp(GT, "g"), ">")
    .replace(new RegExp(QUOT, "g"), '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
