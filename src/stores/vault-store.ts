import { create } from "zustand";
import { toast } from "sonner";
import type {
  CanvasStyle,
  SidebarFilter,
  ThemeName,
  VaultNode,
  VaultPayload,
  VaultSettings,
} from "@/lib/vault/types";
import { DEFAULT_SETTINGS } from "@/lib/vault/types";
import {
  bytesEqual,
  decryptJson,
  deriveAesKey,
  deriveDefaultKey,
  encryptJson,
  fromB64,
  hashPassword,
  toB64,
} from "@/lib/vault/crypto";
import { idbClear, idbGet, idbSet, type StoredMeta, type StoredPayload } from "@/lib/vault/storage";
import { createSeedDocuments, SEED_EXPANDED } from "@/lib/vault/seed";
import { nid, nowIso } from "@/lib/vault/id";
import { byteSize, previewOf } from "@/lib/vault/html";
import {
  childrenOf,
  descendantsOf,
  getById,
  isAncestorOf,
} from "@/lib/vault/tree";
import { applyTheme } from "@/lib/vault/themes";
import { TEMPLATES } from "@/lib/vault/templates";
import { todayTitle } from "@/lib/vault/format";
import { parseImportedFile } from "@/lib/vault/parsers";

export type VaultStatus = "boot" | "locked" | "unlocked";

type Session = { key: CryptoKey; hasPassword: boolean };

let session: Session | null = null;
let persistTimer: number | null = null;
let activityTimer: number | null = null;
let lastActivity = 0;

export interface VaultState {
  status: VaultStatus;
  bootError: string | null;
  hasPassword: boolean;
  documents: VaultNode[];
  expandedIds: string[];
  activeId: string | null;
  selectedIds: string[];
  search: string;
  filter: SidebarFilter;
  tagFilter: string | null;
  settings: VaultSettings;
  zen: boolean;
  readonly: boolean;
  inspectorOpen: boolean;
  mobileNav: boolean;
  editorNonce: number;
  dirty: boolean;
  saving: boolean;
  clipboardLeft: number;
  introOpen: boolean;
  commandOpen: boolean;

  boot: () => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  enterUnprotected: () => Promise<void>;
  lock: () => Promise<void>;
  resetVault: () => Promise<void>;
  setPassword: (current: string, next: string) => Promise<boolean>;
  clearPassword: (current: string) => Promise<boolean>;

  setSearch: (q: string) => void;
  setFilter: (f: SidebarFilter) => void;
  setTagFilter: (t: string | null) => void;
  setActive: (id: string | null) => void;
  toggleSelect: (id: string, additive?: boolean) => void;
  toggleExpanded: (id: string) => void;
  setZen: (v: boolean) => void;
  setReadonly: (v: boolean) => void;
  setInspectorOpen: (v: boolean) => void;
  setMobileNav: (v: boolean) => void;
  setCommandOpen: (v: boolean) => void;
  setIntroOpen: (v: boolean) => void;
  patchSettings: (p: Partial<VaultSettings>) => void;
  setTheme: (t: ThemeName) => void;
  setCanvas: (c: CanvasStyle) => void;
  bumpActivity: () => void;

  createDocument: (opts?: { parentId?: string; name?: string; content?: string; tags?: string[] }) => string;
  createFolder: (opts?: { parentId?: string; name?: string }) => string;
  fromTemplate: (templateId: string, parentId?: string) => string;
  openDailyNote: () => string;
  renameNode: (id: string, name: string) => void;
  updateContent: (id: string, html: string, snapshot?: boolean) => void;
  toggleStar: (id: string) => void;
  setTags: (id: string, tags: string[]) => void;
  setTint: (id: string, tint: VaultNode["tint"]) => void;
  moveNodes: (ids: string[], parentId: string, beforeId?: string | null) => void;
  duplicateNode: (id: string) => string | null;
  trashNodes: (ids: string[]) => void;
  restoreNodes: (ids: string[]) => void;
  shredNodes: (ids: string[]) => void;
  restoreVersion: (id: string, index: number) => void;
  importFiles: (files: FileList | File[]) => Promise<void>;
  restoreBackup: (payload: VaultPayload, mode: "replace" | "merge") => Promise<void>;
  persistNow: () => Promise<void>;
}

function emptyNode(partial: Partial<VaultNode> & Pick<VaultNode, "id" | "type" | "name">): VaultNode {
  const stamp = nowIso();
  const content = partial.content || "";
  return {
    parentId: "",
    content,
    size: byteSize(content),
    createdAt: stamp,
    updatedAt: stamp,
    preview: previewOf(content),
    starred: false,
    tags: [],
    inTrash: false,
    versions: [],
    ...partial,
  };
}

function schedulePersist(get: () => VaultState) {
  if (persistTimer) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    void get().persistNow();
  }, 500);
}

function startIdleWatch(get: () => VaultState, set: (p: Partial<VaultState>) => void) {
  if (activityTimer) window.clearInterval(activityTimer);
  lastActivity = Date.now();
  activityTimer = window.setInterval(() => {
    const mins = get().settings.autoLockMinutes;
    if (!mins || get().status !== "unlocked" || !get().hasPassword) return;
    if (Date.now() - lastActivity > mins * 60_000) {
      toast.message("已自动锁定金库");
      void get().lock();
    }
  }, 5000);
  void set;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  status: "boot",
  bootError: null,
  hasPassword: false,
  documents: [],
  expandedIds: [],
  activeId: null,
  selectedIds: [],
  search: "",
  filter: "all",
  tagFilter: null,
  settings: DEFAULT_SETTINGS,
  zen: false,
  readonly: false,
  inspectorOpen: true,
  mobileNav: false,
  editorNonce: 0,
  dirty: false,
  saving: false,
  clipboardLeft: 0,
  introOpen: false,
  commandOpen: false,

  boot: async () => {
    try {
      const settings = (await idbGet<VaultSettings>("settings")) || DEFAULT_SETTINGS;
      applyTheme(settings.theme);
      set({ settings });
      const meta = await idbGet<StoredMeta>("meta");
      if (!meta) {
        await get().enterUnprotected();
        set({ introOpen: true });
        return;
      }
      if (meta.hasPassword) {
        session = null;
        set({ status: "locked", hasPassword: true, documents: [] });
        return;
      }
      await get().enterUnprotected();
    } catch (err) {
      set({
        bootError: err instanceof Error ? err.message : "无法读取本地金库",
        status: "locked",
      });
    }
  },

  enterUnprotected: async () => {
    const key = await deriveDefaultKey();
    session = { key, hasPassword: false };
    const stored = await idbGet<StoredPayload>("payload");
    let documents: VaultNode[] = [];
    let expandedIds = SEED_EXPANDED;
    if (stored) {
      try {
        const payload = await decryptJson<VaultPayload>(
          fromB64(stored.cipherB64),
          fromB64(stored.nonceB64),
          key,
        );
        documents = payload.documents || [];
        expandedIds = payload.expandedIds || [];
      } catch {
        documents = createSeedDocuments();
      }
    } else {
      documents = createSeedDocuments();
      const meta: StoredMeta = {
        hasPassword: false,
        saltB64: "",
        hashB64: "",
        createdAt: nowIso(),
      };
      await idbSet("meta", meta);
    }
    const welcome = documents.find((d) => d.id === "doc-welcome" && !d.inTrash);
    set({
      status: "unlocked",
      hasPassword: false,
      documents,
      expandedIds,
      activeId: welcome?.id || documents.find((d) => d.type === "document" && !d.inTrash)?.id || null,
      selectedIds: welcome ? [welcome.id] : [],
      readonly: false,
    });
    startIdleWatch(get, set);
    await get().persistNow();
  },

  unlock: async (password: string) => {
    const meta = await idbGet<StoredMeta>("meta");
    if (!meta?.hasPassword) {
      await get().enterUnprotected();
      return true;
    }
    const salt = fromB64(meta.saltB64);
    const hash = fromB64(meta.hashB64);
    const check = await hashPassword(password, salt);
    if (!bytesEqual(check, hash)) return false;
    const key = await deriveAesKey(password, salt);
    const stored = await idbGet<StoredPayload>("payload");
    if (!stored) {
      session = { key, hasPassword: true };
      set({ status: "unlocked", hasPassword: true, documents: [], activeId: null });
      return true;
    }
    try {
      const payload = await decryptJson<VaultPayload>(
        fromB64(stored.cipherB64),
        fromB64(stored.nonceB64),
        key,
      );
      session = { key, hasPassword: true };
      const first = payload.documents.find((d) => d.type === "document" && !d.inTrash);
      set({
        status: "unlocked",
        hasPassword: true,
        documents: payload.documents,
        expandedIds: payload.expandedIds || [],
        activeId: first?.id || null,
        selectedIds: first ? [first.id] : [],
        readonly: get().settings.defaultReadonly,
      });
      startIdleWatch(get, set);
      return true;
    } catch {
      return false;
    }
  },

  lock: async () => {
    await get().persistNow();
    session = null;
    if (activityTimer) {
      window.clearInterval(activityTimer);
      activityTimer = null;
    }
    set({
      status: "locked",
      documents: [],
      activeId: null,
      selectedIds: [],
      search: "",
      zen: false,
      commandOpen: false,
      mobileNav: false,
    });
  },

  resetVault: async () => {
    session = null;
    await idbClear();
    await get().enterUnprotected();
    toast.success("金库已重置，演示内容已重新写入");
  },

  setPassword: async (current, next) => {
    if (!next.trim()) return false;
    const meta = (await idbGet<StoredMeta>("meta")) || {
      hasPassword: false,
      saltB64: "",
      hashB64: "",
      createdAt: nowIso(),
    };
    if (meta.hasPassword) {
      const salt = fromB64(meta.saltB64);
      const ok = bytesEqual(await hashPassword(current, salt), fromB64(meta.hashB64));
      if (!ok) return false;
    }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await hashPassword(next, salt);
    const key = await deriveAesKey(next, salt);
    session = { key, hasPassword: true };
    await idbSet("meta", {
      hasPassword: true,
      saltB64: toB64(salt),
      hashB64: toB64(hash),
      createdAt: meta.createdAt,
    } satisfies StoredMeta);
    set({ hasPassword: true });
    await get().persistNow();
    return true;
  },

  clearPassword: async (current) => {
    const meta = await idbGet<StoredMeta>("meta");
    if (!meta?.hasPassword) return true;
    const salt = fromB64(meta.saltB64);
    const ok = bytesEqual(await hashPassword(current, salt), fromB64(meta.hashB64));
    if (!ok) return false;
    const key = await deriveDefaultKey();
    session = { key, hasPassword: false };
    await idbSet("meta", {
      hasPassword: false,
      saltB64: "",
      hashB64: "",
      createdAt: meta.createdAt,
    } satisfies StoredMeta);
    set({ hasPassword: false });
    await get().persistNow();
    return true;
  },

  setSearch: (q) => set({ search: q }),
  setFilter: (f) => set({ filter: f }),
  setTagFilter: (t) => set({ tagFilter: t }),
  setActive: (id) => {
    const node = getById(get().documents, id);
    const ro = node?.type === "document" ? get().settings.defaultReadonly : false;
    set({
      activeId: id,
      selectedIds: id ? [id] : [],
      readonly: ro,
      mobileNav: false,
    });
  },
  toggleSelect: (id, additive) => {
    if (!additive) {
      get().setActive(id);
      return;
    }
    const cur = get().selectedIds;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    set({ selectedIds: next, activeId: id });
  },
  toggleExpanded: (id) => {
    const cur = get().expandedIds;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    set({ expandedIds: next, dirty: true });
    schedulePersist(get);
  },
  setZen: (v) => set({ zen: v, mobileNav: false }),
  setReadonly: (v) => set({ readonly: v }),
  setInspectorOpen: (v) => set({ inspectorOpen: v }),
  setMobileNav: (v) => set({ mobileNav: v }),
  setCommandOpen: (v) => set({ commandOpen: v }),
  setIntroOpen: (v) => set({ introOpen: v }),
  patchSettings: (p) => {
    const settings = { ...get().settings, ...p };
    set({ settings, dirty: true });
    void idbSet("settings", settings);
    schedulePersist(get);
  },
  setTheme: (t) => {
    applyTheme(t);
    get().patchSettings({ theme: t });
  },
  setCanvas: (c) => get().patchSettings({ canvas: c }),
  bumpActivity: () => {
    lastActivity = Date.now();
  },

  createDocument: (opts = {}) => {
    const parentId = opts.parentId ?? inferParent(get());
    const doc = emptyNode({
      id: nid(),
      type: "document",
      parentId,
      name: opts.name || `新文档 ${nowIso().slice(5, 16)}`,
      content: opts.content || "<p></p>",
      tags: opts.tags || [],
    });
    set((s) => ({
      documents: [doc, ...s.documents],
      activeId: doc.id,
      selectedIds: [doc.id],
      readonly: false,
      expandedIds: parentId && !s.expandedIds.includes(parentId) ? [...s.expandedIds, parentId] : s.expandedIds,
      dirty: true,
      editorNonce: s.editorNonce + 1,
    }));
    schedulePersist(get);
    return doc.id;
  },

  createFolder: (opts = {}) => {
    const parentId = opts.parentId ?? inferParent(get());
    const folder = emptyNode({
      id: nid(),
      type: "folder",
      parentId,
      name: opts.name || "新建文件夹",
      content: "",
      tint: "slate",
    });
    set((s) => ({
      documents: [folder, ...s.documents],
      activeId: folder.id,
      selectedIds: [folder.id],
      expandedIds: parentId && !s.expandedIds.includes(parentId) ? [...s.expandedIds, parentId] : s.expandedIds,
      dirty: true,
    }));
    schedulePersist(get);
    return folder.id;
  },

  fromTemplate: (templateId, parentId) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
    return get().createDocument({
      parentId,
      name: tpl.name,
      content: tpl.html,
      tags: tpl.tags,
    });
  },

  openDailyNote: () => {
    const title = todayTitle();
    const existing = get().documents.find(
      (d) => !d.inTrash && d.type === "document" && d.name === title,
    );
    if (existing) {
      get().setActive(existing.id);
      set({ readonly: false });
      return existing.id;
    }
    const personal = get().documents.find((d) => d.id === "fld-personal")?.id || "";
    return get().createDocument({
      parentId: personal,
      name: title,
      content: `<h1>${title}</h1><p></p>`,
      tags: ["手记"],
    });
  },

  renameNode: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    patchNode(set, get, id, (n) => ({ ...n, name: trimmed, updatedAt: nowIso() }));
  },

  updateContent: (id, html, snapshot) => {
    patchNode(set, get, id, (n) => {
      const versions = snapshot && n.content !== html
        ? [{ at: nowIso(), name: n.name, content: n.content }, ...n.versions].slice(0, 8)
        : n.versions;
      return {
        ...n,
        content: html,
        preview: previewOf(html),
        size: byteSize(html),
        updatedAt: nowIso(),
        versions,
      };
    });
  },

  toggleStar: (id) => {
    patchNode(set, get, id, (n) => ({ ...n, starred: !n.starred, updatedAt: nowIso() }));
  },

  setTags: (id, tags) => {
    patchNode(set, get, id, (n) => ({ ...n, tags, updatedAt: nowIso() }));
  },

  setTint: (id, tint) => {
    patchNode(set, get, id, (n) => ({ ...n, tint, updatedAt: nowIso() }));
  },

  moveNodes: (ids, parentId, beforeId) => {
    const docs = get().documents;
    for (const id of ids) {
      if (isAncestorOf(docs, id, parentId)) {
        toast.error("不能把文件夹移进它自己的子级");
        return;
      }
    }
    const moving = docs.filter((d) => ids.includes(d.id)).map((d) => ({ ...d, parentId }));
    const rest = docs.filter((d) => !ids.includes(d.id));
    let next: VaultNode[];
    if (beforeId) {
      const idx = rest.findIndex((d) => d.id === beforeId);
      next = idx >= 0 ? [...rest.slice(0, idx), ...moving, ...rest.slice(idx)] : [...rest, ...moving];
    } else {
      next = [...moving, ...rest];
    }
    const expanded = parentId && !get().expandedIds.includes(parentId)
      ? [...get().expandedIds, parentId]
      : get().expandedIds;
    set({ documents: next, expandedIds: expanded, dirty: true });
    schedulePersist(get);
  },

  duplicateNode: (id) => {
    const src = getById(get().documents, id);
    if (!src || src.type === "folder") return null;
    const copy = emptyNode({
      ...src,
      id: nid(),
      name: `${src.name} 副本`,
      versions: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    set((s) => ({
      documents: [copy, ...s.documents],
      activeId: copy.id,
      selectedIds: [copy.id],
      dirty: true,
      editorNonce: s.editorNonce + 1,
    }));
    schedulePersist(get);
    return copy.id;
  },

  trashNodes: (ids) => {
    const all = new Set(ids);
    const docs = get().documents;
    for (const id of ids) descendantsOf(docs, id).forEach((c) => all.add(c));
    const stamp = nowIso();
    set({
      documents: docs.map((d) => (all.has(d.id) ? { ...d, inTrash: true, deletedAt: stamp } : d)),
      activeId: all.has(get().activeId || "") ? null : get().activeId,
      selectedIds: get().selectedIds.filter((id) => !all.has(id)),
      dirty: true,
    });
    schedulePersist(get);
  },

  restoreNodes: (ids) => {
    const docs = get().documents;
    set({
      documents: docs.map((d) => {
        if (!ids.includes(d.id)) return d;
        const parent = getById(docs, d.parentId);
        const parentId = !d.parentId || !parent || parent.inTrash ? "" : d.parentId;
        return { ...d, inTrash: false, deletedAt: undefined, parentId, updatedAt: nowIso() };
      }),
      dirty: true,
    });
    schedulePersist(get);
  },

  shredNodes: (ids) => {
    const all = new Set(ids);
    const docs = get().documents;
    for (const id of ids) descendantsOf(docs, id).forEach((c) => all.add(c));
    set({
      documents: docs.filter((d) => !all.has(d.id)),
      activeId: all.has(get().activeId || "") ? null : get().activeId,
      selectedIds: get().selectedIds.filter((id) => !all.has(id)),
      dirty: true,
    });
    schedulePersist(get);
  },

  restoreVersion: (id, index) => {
    const node = getById(get().documents, id);
    if (!node?.versions[index]) return;
    const ver = node.versions[index];
    get().updateContent(id, ver.content, true);
    set((s) => ({ editorNonce: s.editorNonce + 1, readonly: false }));
    toast.success("已恢复历史版本");
  },

  importFiles: async (files) => {
    const parentId = inferParent(get());
    const list = Array.from(files);
    for (const file of list) {
      try {
        if (file.name.endsWith(".json") && file.size < 8_000_000) {
          const raw = JSON.parse(await file.text()) as VaultPayload | VaultNode;
          if ("documents" in raw && Array.isArray(raw.documents)) {
            await get().restoreBackup(raw, "merge");
            continue;
          }
        }
        const parsed = await parseImportedFile(file);
        get().createDocument({
          parentId,
          name: parsed.name,
          content: parsed.html,
        });
      } catch (err) {
        toast.error(`导入失败：${file.name}`, {
          description: err instanceof Error ? err.message : "无法解析",
        });
      }
    }
  },

  restoreBackup: async (payload, mode) => {
    if (mode === "replace") {
      set({
        documents: payload.documents,
        expandedIds: payload.expandedIds || [],
        activeId: payload.documents.find((d) => d.type === "document" && !d.inTrash)?.id || null,
        dirty: true,
      });
    } else {
      const existing = new Set(get().documents.map((d) => d.id));
      const incoming = payload.documents.map((d) =>
        existing.has(d.id) ? { ...d, id: nid() } : d,
      );
      set((s) => ({ documents: [...incoming, ...s.documents], dirty: true }));
    }
    await get().persistNow();
    toast.success(mode === "replace" ? "已用备份替换金库" : "已合并备份文档");
  },

  persistNow: async () => {
    if (!session) return;
    set({ saving: true });
    try {
      const payload: VaultPayload = {
        documents: get().documents,
        expandedIds: get().expandedIds,
        savedAt: nowIso(),
      };
      const { nonce, ciphertext } = await encryptJson(payload, session.key);
      await idbSet("payload", {
        nonceB64: toB64(nonce),
        cipherB64: toB64(ciphertext),
      } satisfies StoredPayload);
      await idbSet("settings", get().settings);
      set({ dirty: false, saving: false });
    } catch (err) {
      set({ saving: false });
      toast.error("写入金库失败", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  },
}));

function inferParent(state: VaultState): string {
  const node = getById(state.documents, state.activeId);
  if (!node) return "";
  if (node.type === "folder") return node.id;
  return node.parentId || "";
}

function patchNode(
  set: (partial: Partial<VaultState> | ((s: VaultState) => Partial<VaultState>)) => void,
  get: () => VaultState,
  id: string,
  fn: (n: VaultNode) => VaultNode,
) {
  set({
    documents: get().documents.map((d) => (d.id === id ? fn(d) : d)),
    dirty: true,
  });
  schedulePersist(get);
}

export function activeNode(): VaultNode | undefined {
  const s = useVaultStore.getState();
  return getById(s.documents, s.activeId);
}

export function folderChildCount(id: string): number {
  return childrenOf(useVaultStore.getState().documents, id).length;
}
