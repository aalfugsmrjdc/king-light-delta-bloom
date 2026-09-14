import { useMemo, useState } from "react";
import { Clock, Hash, ListTree, Star, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelative, formatSize, formatStamp } from "@/lib/vault/format";
import { outlineFromHtml, wordStats } from "@/lib/vault/html";
import { useVaultStore } from "@/stores/vault-store";
import type { VaultNode } from "@/lib/vault/types";
import { cn } from "@/lib/utils";

export function Inspector({ node }: { node: VaultNode }) {
  if (node.type === "folder") return <FolderInspector node={node} />;
  return <DocInspector node={node} />;
}

function FolderInspector({ node }: { node: VaultNode }) {
  const documents = useVaultStore((s) => s.documents);
  const count = documents.filter((d) => !d.inTrash && d.parentId === node.id).length;
  return (
    <aside className="flex h-full flex-col border-l border-border bg-card/40">
      <Header title="文件夹" />
      <div className="space-y-3 p-4 text-sm">
        <Field label="名称" value={node.name} />
        <Field label="内含" value={`${count} 项`} />
        <Field label="更新" value={formatRelative(node.updatedAt)} />
      </div>
    </aside>
  );
}

function DocInspector({ node }: { node: VaultNode }) {
  const restoreVersion = useVaultStore((s) => s.restoreVersion);
  const setTags = useVaultStore((s) => s.setTags);
  const toggleStar = useVaultStore((s) => s.toggleStar);
  const outline = useMemo(() => outlineFromHtml(node.content), [node.content]);
  const stats = useMemo(() => wordStats(node.content), [node.content]);
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || node.tags.includes(t)) return;
    setTags(node.id, [...node.tags, t]);
    setTagInput("");
  };

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border bg-card/40">
      <Header title="文档信息" />
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 p-4">
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Hash className="size-3" />
              概要
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat k="字数" v={String(stats.chars)} />
              <Stat k="阅读" v={`${stats.minutes} 分`} />
              <Stat k="大小" v={formatSize(node.size)} />
              <Stat k="版本" v={String(node.versions.length)} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">更新于 {formatStamp(node.updatedAt)}</p>
            <Button size="sm" variant="ghost" className="mt-2 h-8 px-2" onClick={() => toggleStar(node.id)}>
              <Star className={cn("size-3.5", node.starred && "fill-primary text-primary")} />
              {node.starred ? "已加星标" : "加星标"}
            </Button>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Tag className="size-3" />
              标签
            </h3>
            <div className="flex flex-wrap gap-1">
              {node.tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="rounded-full bg-secondary px-2 py-0.5 text-[11px] hover:bg-destructive/15"
                  onClick={() => setTags(node.id, node.tags.filter((x) => x !== t))}
                  title="点击移除"
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-1">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                placeholder="添加标签"
                className="h-8"
              />
              <Button size="sm" variant="outline" className="h-8" onClick={addTag}>
                加
              </Button>
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <ListTree className="size-3" />
              大纲
            </h3>
            {outline.length === 0 ? (
              <p className="text-xs text-muted-foreground">使用标题后将在此生成目录</p>
            ) : (
              <ul className="space-y-1">
                {outline.map((h) => (
                  <li
                    key={h.id}
                    className="truncate text-xs text-muted-foreground"
                    style={{ paddingLeft: (h.level - 1) * 10 }}
                  >
                    {h.text}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Clock className="size-3" />
              历史快照
            </h3>
            {node.versions.length === 0 ? (
              <p className="text-xs text-muted-foreground">保存较大改动时会留下最近 8 次快照</p>
            ) : (
              <ul className="space-y-1">
                {node.versions.map((v, i) => (
                  <li key={v.at + i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate text-muted-foreground">{formatStamp(v.at)}</span>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => restoreVersion(node.id, i)}>
                      恢复
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div className="border-b border-border px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {title}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-secondary/70 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="tabular-nums">{v}</div>
    </div>
  );
}
