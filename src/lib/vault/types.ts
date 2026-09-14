export type NodeType = "document" | "folder";
export type ThemeName = "night" | "paper" | "forest" | "ocean";
export type FolderTint = "slate" | "blue" | "teal" | "rose" | "amber";
export type CanvasMode = "default" | "eyecare" | "parchment" | "dark" | "custom";
export type SidebarFilter = "all" | "starred" | "recent";

export interface CanvasStyle {
  mode: CanvasMode;
  bg: string;
  fg: string;
}

export interface DocVersion {
  at: string;
  name: string;
  content: string;
}

export interface VaultNode {
  id: string;
  type: NodeType;
  parentId: string;
  name: string;
  content: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  preview: string;
  starred: boolean;
  tags: string[];
  tint?: FolderTint;
  inTrash: boolean;
  deletedAt?: string;
  versions: DocVersion[];
}

export interface VaultSettings {
  theme: ThemeName;
  clipboardTimeout: number;
  defaultReadonly: boolean;
  autoLockMinutes: number;
  canvas: CanvasStyle;
}

export interface VaultMeta {
  hasPassword: boolean;
  salt: Uint8Array;
  pwdHash: Uint8Array;
  createdAt: string;
}

export interface VaultPayload {
  documents: VaultNode[];
  expandedIds: string[];
  savedAt: string;
}

export const DEFAULT_SETTINGS: VaultSettings = {
  theme: "night",
  clipboardTimeout: 30,
  defaultReadonly: false,
  autoLockMinutes: 15,
  canvas: { mode: "default", bg: "", fg: "" },
};

export const DEFAULT_PASSPHRASE = "mixia.default.empty.key";
export const DEFAULT_SALT_ASCII = "0000000000000000";
