import type { VaultNode } from "./types";

export function getById(docs: VaultNode[], id: string | null | undefined): VaultNode | undefined {
  if (!id) return undefined;
  return docs.find((d) => d.id === id);
}

export function activeDocs(docs: VaultNode[]): VaultNode[] {
  return docs.filter((d) => !d.inTrash);
}

export function trashDocs(docs: VaultNode[]): VaultNode[] {
  return docs.filter((d) => d.inTrash);
}

export function childrenOf(docs: VaultNode[], parentId: string): VaultNode[] {
  const level = docs.filter((d) => !d.inTrash && (d.parentId || "") === parentId);
  const folders = level.filter((d) => d.type === "folder");
  const files = level.filter((d) => d.type !== "folder");
  return [...folders, ...files];
}

export function descendantsOf(docs: VaultNode[], folderId: string): string[] {
  const out: string[] = [];
  for (const d of docs) {
    if (d.parentId === folderId) {
      out.push(d.id);
      if (d.type === "folder") out.push(...descendantsOf(docs, d.id));
    }
  }
  return out;
}

export function isAncestorOf(docs: VaultNode[], ancestorId: string, candidateId: string): boolean {
  if (!ancestorId || !candidateId) return false;
  if (ancestorId === candidateId) return true;
  const visited = new Set<string>();
  let cur: string | undefined = candidateId;
  while (cur && !visited.has(cur)) {
    visited.add(cur);
    const node = getById(docs, cur);
    if (!node) break;
    if (node.parentId === ancestorId) return true;
    cur = node.parentId;
  }
  return false;
}

export function folderPath(docs: VaultNode[], folderId: string): string {
  if (!folderId) return "根目录";
  const parts: string[] = [];
  const visited = new Set<string>();
  let cur: string | undefined = folderId;
  while (cur && !visited.has(cur)) {
    visited.add(cur);
    const node = getById(docs, cur);
    if (!node || node.type !== "folder") break;
    parts.push(node.name);
    cur = node.parentId;
  }
  return parts.reverse().join(" / ") || "根目录";
}

export function breadcrumbs(docs: VaultNode[], id: string): VaultNode[] {
  const chain: VaultNode[] = [];
  const visited = new Set<string>();
  let cur: string | undefined = id;
  while (cur && !visited.has(cur)) {
    visited.add(cur);
    const node = getById(docs, cur);
    if (!node) break;
    chain.push(node);
    cur = node.parentId;
  }
  return chain.reverse();
}

export function collectTags(docs: VaultNode[]): string[] {
  const set = new Set<string>();
  for (const d of docs) {
    if (d.inTrash) continue;
    for (const t of d.tags) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "zh"));
}

export function matchesQuery(node: VaultNode, q: string): boolean {
  if (!q) return true;
  const k = q.toLowerCase();
  if (node.name.toLowerCase().includes(k)) return true;
  if (node.preview.toLowerCase().includes(k)) return true;
  if (node.tags.some((t) => t.toLowerCase().includes(k))) return true;
  if (!node.inTrash && node.type === "document" && node.content.toLowerCase().includes(k)) {
    return true;
  }
  return false;
}

export function recentDocs(docs: VaultNode[], n = 6): VaultNode[] {
  return activeDocs(docs)
    .filter((d) => d.type === "document")
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, n);
}
