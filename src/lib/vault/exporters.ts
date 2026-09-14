import JSZip from "jszip";
import { htmlToPlain, escapeHtml } from "./html";
import type { VaultNode, VaultPayload } from "./types";

export type ExportKind = "txt" | "md" | "html" | "docx" | "json";

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function exportDocument(node: VaultNode, kind: ExportKind) {
  const base = sanitizeFilename(node.name || "文档");
  if (kind === "txt") {
    downloadBlob(`${base}.txt`, new Blob([htmlToPlain(node.content)], { type: "text/plain;charset=utf-8" }));
    return;
  }
  if (kind === "md") {
    const md = htmlToMarkdown(node.content, node.name);
    downloadBlob(`${base}.md`, new Blob([md], { type: "text/markdown;charset=utf-8" }));
    return;
  }
  if (kind === "html") {
    downloadBlob(`${base}.html`, new Blob([wrapHtml(node.content, node.name)], { type: "text/html;charset=utf-8" }));
    return;
  }
  if (kind === "json") {
    downloadBlob(`${base}.json`, new Blob([JSON.stringify(node, null, 2)], { type: "application/json" }));
    return;
  }
  const buf = await buildDocx(node.content, node.name);
  downloadBlob(`${base}.docx`, new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
}

export function exportVaultJson(payload: VaultPayload) {
  downloadBlob(
    `mixia-backup-${new Date().toISOString().slice(0, 10)}.json`,
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
  );
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80) || "document";
}

function wrapHtml(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: "Noto Serif SC", "Literata", Georgia, serif; line-height: 1.7; max-width: 42rem; margin: 3rem auto; padding: 0 1.5rem; color: #1c1917; }
  a { color: #1d4ed8; }
  code { font-family: ui-monospace, monospace; font-size: 0.9em; }
  blockquote { border-left: 3px solid #d6d3d1; margin: 0; padding: 0 1rem; color: #57534e; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${content}
</body>
</html>`;
}

export function htmlToMarkdown(html: string, title?: string): string {
  if (typeof document === "undefined") return htmlToPlain(html);
  const root = document.createElement("div");
  root.innerHTML = html;
  const lines: string[] = [];
  if (title) lines.push(`# ${title}`, "");

  const walkBlock = (el: Element): string => {
    const tag = el.tagName.toLowerCase();
    if (tag === "h1") return `# ${inline(el)}`;
    if (tag === "h2") return `## ${inline(el)}`;
    if (tag === "h3") return `### ${inline(el)}`;
    if (tag === "blockquote") return `> ${inline(el)}`;
    if (tag === "pre") return `\`\`\`\n${el.textContent || ""}\n\`\`\``;
    if (tag === "hr") return "---";
    if (tag === "ul" && el.getAttribute("data-type") === "taskList") {
      return Array.from(el.children)
        .map((li) => `- [${li.getAttribute("data-checked") === "true" ? "x" : " "}] ${inline(li)}`)
        .join("\n");
    }
    if (tag === "ul") {
      return Array.from(el.children).map((li) => `- ${inline(li)}`).join("\n");
    }
    if (tag === "ol") {
      return Array.from(el.children).map((li, i) => `${i + 1}. ${inline(li)}`).join("\n");
    }
    if (tag === "p") return inline(el);
    return inline(el);
  };

  const inline = (el: Element): string => {
    let s = "";
    el.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) s += n.textContent || "";
      else if (n instanceof HTMLElement) {
        const t = n.tagName.toLowerCase();
        const inner = inline(n);
        if (t === "strong" || t === "b") s += `**${inner}**`;
        else if (t === "em" || t === "i") s += `*${inner}*`;
        else if (t === "code") s += `\`${inner}\``;
        else if (t === "a") s += `[${inner}](${n.getAttribute("href") || ""})`;
        else if (t === "mark") s += `==${inner}==`;
        else s += inner;
      }
    });
    return s.trim();
  };

  Array.from(root.children).forEach((child) => {
    const block = walkBlock(child);
    if (block) lines.push(block, "");
  });
  return lines.join("\n").trim() + "\n";
}

async function buildDocx(html: string, title: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const body = htmlToPlain(html)
    .split("\n")
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeHtml(line)}</w:t></w:r></w:p>`)
    .join("");
  const titleP = `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeHtml(title)}</w:t></w:r></w:p>`;
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${titleP}${body}</w:body>
</w:document>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}
