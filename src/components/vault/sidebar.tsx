import { useState } from "react";
import { FilePlus, FolderPlus, Search, Star, Trash2 } from "lucide-react";
import { MixiaWordmark } from "./logo";
import { DocumentTree } from "./document-tree";
import { TrashDialog } from "./trash-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { collectTags, trashDocs } from "@/lib/vault/tree";
import { useVaultStore } from "@/stores/vault-store";

export function Sidebar({ className }: { className?: string }) {
  const search = useVaultStore((s) => s.search);
  const setSearch = useVaultStore((s) => s.setSearch);
  const filter = useVaultStore((s) => s.filter);
  const setFilter = useVaultStore((s) => s.setFilter);
  const tagFilter = useVaultStore((s) => s.tagFilter);
  const setTagFilter = useVaultStore((s) => s.setTagFilter);
  const createDocument = useVaultStore((s) => s.createDocument);
  const createFolder = useVaultStore((s) => s.createFolder);
  const documents = useVaultStore((s) => s.documents);
  const tags = collectTags(documents);
  const trashCount = trashDocs(documents).length;
  const [trashOpen, setTrashOpen] = useState(false);

  return (
    <aside className={cn("flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground", className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <MixiaWordmark />
      </div>
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="检索全文…"
            className="h-8 bg-background/60 pl-8"
          />
        </div>
        <div className="mt-2 flex gap-1">
          <Button size="sm" className="flex-1" onClick={() => createDocument()}>
            <FilePlus className="size-3.5" />
            文档
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => createFolder()}>
            <FolderPlus className="size-3.5" />
            文件夹
          </Button>
        </div>
      </div>
      <div className="flex gap-1 px-3 pb-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          全部
        </FilterChip>
        <FilterChip active={filter === "starred"} onClick={() => setFilter("starred")}>
          <Star className="size-3" />
          星标
        </FilterChip>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pb-2">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTagFilter(tagFilter === t ? null : t)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px]",
                tagFilter === t
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <ScrollArea className="min-h-0 flex-1">
        <DocumentTree />
      </ScrollArea>
      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => setTrashOpen(true)}
          className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Trash2 className="size-3.5" />
          回收站
          {trashCount > 0 && <span className="ml-auto tabular-nums text-xs">{trashCount}</span>}
        </button>
      </div>
      <TrashDialog open={trashOpen} onOpenChange={setTrashOpen} />
    </aside>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
