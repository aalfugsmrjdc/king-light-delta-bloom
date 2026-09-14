import { FilePlus, Folder, Star, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/vault/format";
import { childrenOf, recentDocs } from "@/lib/vault/tree";
import { TEMPLATES } from "@/lib/vault/templates";
import { useVaultStore } from "@/stores/vault-store";
import type { VaultNode } from "@/lib/vault/types";
import { MixiaMark } from "./logo";

export function Dashboard() {
  const documents = useVaultStore((s) => s.documents);
  const setActive = useVaultStore((s) => s.setActive);
  const createDocument = useVaultStore((s) => s.createDocument);
  const fromTemplate = useVaultStore((s) => s.fromTemplate);
  const openDailyNote = useVaultStore((s) => s.openDailyNote);
  const recents = recentDocs(documents, 5);
  const starred = documents.filter((d) => !d.inTrash && d.starred && d.type === "document");
  const docs = documents.filter((d) => !d.inTrash && d.type === "document").length;
  const folders = documents.filter((d) => !d.inTrash && d.type === "folder").length;

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-start gap-4">
          <MixiaMark className="size-11" />
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">今天写什么</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {docs} 篇文档 · {folders} 个文件夹 · 数据仅保存在本机
            </p>
          </div>
        </div>
        <div className="mb-8 flex flex-wrap gap-2">
          <Button onClick={() => createDocument()}>
            <FilePlus className="size-3.5" />
            新建文档
          </Button>
          <Button variant="outline" onClick={() => openDailyNote()}>
            <StickyNote className="size-3.5" />
            今日手记
          </Button>
        </div>

        <Section title="模板">
          <div className="grid gap-2 sm:grid-cols-2">
            {TEMPLATES.filter((t) => t.id !== "blank").map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => fromTemplate(t.id)}
                className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40"
              >
                <div className="text-sm font-medium">{t.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t.tags.join(" · ") || "空白结构"}</div>
              </button>
            ))}
          </div>
        </Section>

        {starred.length > 0 && (
          <Section title="星标">
            <DocList items={starred} onOpen={setActive} />
          </Section>
        )}

        <Section title="最近编辑">
          {recents.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有文档</p>
          ) : (
            <DocList items={recents} onOpen={setActive} />
          )}
        </Section>
      </div>
    </div>
  );
}

export function FolderView({ node }: { node: VaultNode }) {
  const documents = useVaultStore((s) => s.documents);
  const setActive = useVaultStore((s) => s.setActive);
  const createDocument = useVaultStore((s) => s.createDocument);
  const children = childrenOf(documents, node.id);

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Folder className="size-6 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{node.name}</h1>
            <p className="text-sm text-muted-foreground">{children.length} 项</p>
          </div>
          <Button className="ml-auto" onClick={() => createDocument({ parentId: node.id })}>
            <FilePlus className="size-3.5" />
            在此新建
          </Button>
        </div>
        {children.length === 0 ? (
          <p className="text-sm text-muted-foreground">这个文件夹还是空的</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {children.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActive(c.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/60"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{formatRelative(c.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function DocList({ items, onOpen }: { items: VaultNode[]; onOpen: (id: string) => void }) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {items.map((d) => (
        <li key={d.id}>
          <button
            type="button"
            onClick={() => onOpen(d.id)}
            className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-secondary/60"
          >
            {d.starred && <Star className="mt-0.5 size-3.5 fill-primary text-primary" />}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{d.name}</div>
              <div className="truncate text-xs text-muted-foreground">{d.preview || "空文档"}</div>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(d.updatedAt)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
