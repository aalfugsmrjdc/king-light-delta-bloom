import JSZip from "jszip";
import { wrapParagraphs, escapeHtml, decodeXmlEntities } from "./html";

export async function parseImportedFile(file: File): Promise<{ name: string; html: string }> {
  const name = file.name.replace(/\.[^.]+$/, "");
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (ext === "docx") return { name, html: await parseDocx(file) };
  if (ext === "json") {
    const text = await file.text();
    return { name, html: `<pre><code>${escapeHtml(text.slice(0, 20000))}</code></pre>` };
  }
  const text = await readTextFile(file);
  if (ext === "html" || ext === "htm") return { name, html: extractBody(text) };
  if (ext === "md" || ext === "markdown") return { name, html: markdownToHtml(text) };
  return { name, html: wrapParagraphs(text) };
}

async function readTextFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const encodings: string[] = ["utf-8", "gb18030", "gbk", "utf-16le"];
  for (const encoding of encodings) {
    try {
      const decoded = new TextDecoder(encoding, { fatal: encoding === "utf-8" }).decode(buf);
      if (decoded.includes("\uFFFD") && encoding !== "utf-8") continue;
      return decoded;
    } catch {
      continue;
    }
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}

function extractBody(html: string): string {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (body?.[1] || html).trim() || "<p></p>";
}

export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let listType: "ul" | "ol" | "task" | null = null;

  const closeList = () => {
    if (listType === "task") out.push("</ul>");
    else if (listType) out.push(`</${listType}>`);
    listType = null;
  };

  const inline = (s: string) =>
    escapeHtml(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  for (const raw of lines) {
    if (raw.startsWith("```")) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      continue;
    }
    if (/^\s*$/.test(raw)) {
      closeList();
      continue;
    }
    const h = raw.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      closeList();
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      continue;
    }
    if (/^>\s?/.test(raw)) {
      closeList();
      out.push(`<blockquote><p>${inline(raw.replace(/^>\s?/, ""))}</p></blockquote>`);
      continue;
    }
    const task = raw.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/);
    if (task) {
      if (listType !== "task") {
        closeList();
        out.push('<ul data-type="taskList">');
        listType = "task";
      }
      const checked = task[1] !== " ";
      out.push(
        `<li data-type="taskItem" data-checked="${checked}"><label><input type="checkbox"${checked ? " checked" : ""}><span></span></label><div><p>${inline(task[2])}</p></div></li>`,
      );
      continue;
    }
    const ul = raw.match(/^\s*[-*]\s+(.*)$/);
    if (ul) {
      if (listType !== "ul") {
        closeList();
        out.push("<ul>");
        listType = "ul";
      }
      out.push(`<li><p>${inline(ul[1])}</p></li>`);
      continue;
    }
    const ol = raw.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      if (listType !== "ol") {
        closeList();
        out.push("<ol>");
        listType = "ol";
      }
      out.push(`<li><p>${inline(ol[1])}</p></li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(raw)}</p>`);
  }
  closeList();
  if (inCode) out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
  return out.join("") || "<p></p>";
}

async function parseDocx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("无法读取 Word 文档结构");
  const paras: string[] = [];
  const pRe = /<w:p\b[\s\S]*?<\/w:p>/g;
  const tRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = pRe.exec(xml))) {
    const texts: string[] = [];
    let t: RegExpExecArray | null;
    const chunk = m[0];
    tRe.lastIndex = 0;
    while ((t = tRe.exec(chunk))) texts.push(decodeXml(t[1]));
    const line = texts.join("");
    paras.push(`<p>${escapeHtml(line) || "<br>"}</p>`);
  }
  return paras.join("") || "<p></p>";
}

function decodeXml(s: string): string {
  return decodeXmlEntities(s);
}
