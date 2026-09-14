import { useMemo, useState } from "react";
import {
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VaultNode } from "@/lib/vault/types";
import { childrenOf, matchesQuery } from "@/lib/vault/tree";
import { TINT_CLASS } from "@/lib/vault/themes";
import { useVaultStore } from "@/stores/vault-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportDocument } from "@/lib/vault/exporters";

export function DocumentTree() {
  const documents = useVaultStore((s) => s.documents);
  const search = useVaultStore((s) => s.search);
  const filter = useVaultStore((s) => s.filter);
  const tagFilter = useVaultStore((s) => s.tagFilter);

  const visible = useMemo(() => {
    let list = documents.filter((d) => !d.inTrash);
    if (filter === "starred") list = list.filter((d) => d.starred || d.type === "folder");
    if (tagFilter) {
      const tagged = new Set(list.filter((d) => d.tags.includes(tagFilter)).map((d) => d.id));
      list = list.filter((d) => tagged.has(d.id) || d.type === "folder");
    }
    if (search.trim()) list = list.filter((d) => matchesQuery(d, search.trim()) || d.type === "folder");
    return list;
  }, [documents, search, filter, tagFilter]);

  return (
    <div className="px-1 pb-4" role="tree">
      <TreeLevel docs={visible} parentId="" depth={0} />
    </div>
  );
}

function TreeLevel({ docs, parentId, depth }: { docs: VaultNode[]; parentId: string; depth: number }) {
  const nodes = childrenOf(docs, parentId);
  if (!nodes.length && depth === 0) {
    return <p className="px-3 py-6 text-center text-xs text-muted-foreground">没有匹配的文档</p>;
  }
  return (
    <ul className="flex flex-col gap-px">
      {nodes.map((n) => (
        <TreeRow key={n.id} node={n} docs={docs} depth={depth} />
      ))}
    </ul>
  );
}

function TreeRow({ node, docs, depth }: { node: VaultNode; docs: VaultNode[]; depth: number }) {
  const expandedIds = useVaultStore((s) => s.expandedIds);
  const activeId = useVaultStore((s) => s.activeId);
  const selectedIds = useVaultStore((s) => s.selectedIds);
  const toggleExpanded = useVaultStore((s) => s.toggleExpanded);
  const toggleSelect = useVaultStore((s) => s.toggleSelect);
  const moveNodes = useVaultStore((s) => s.moveNodes);
  const expanded = expandedIds.includes(node.id);
  const selected = selectedIds.includes(node.id);
  const active = activeId === node.id;
  const [dragOver, setDragOver] = useState(false);
  const tint = node.tint ? TINT_CLASS[node.tint] : node.type === "folder" ? "text-primary" : "text-muted-foreground";

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const id = e.dataTransfer.getData("text/mixia-id");
    if (!id || id === node.id) return;
    const parentId = node.type === "folder" ? node.id : node.parentId;
    moveNodes([id], parentId || "");
  };

  return (
    <li role="treeitem" aria-expanded={node.type === "folder" ? expanded : undefined}>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/mixia-id", node.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={(e) => toggleSelect(node.id, e.metaKey || e.ctrlKey)}
        onDoubleClick={() => node.type === "folder" && toggleExpanded(node.id)}
        style={{ paddingLeft: 8 + depth * 14 }}
        className={cn(
          "group flex h-9 cursor-pointer items-center gap-1 rounded-md pr-1 text-sm",
          selected || active ? "bg-primary/12 text-foreground" : "text-foreground/90 hover:bg-secondary",
          dragOver && "ring-1 ring-primary",
        )}
      >
        {node.type === "folder" ? (
          <button
            type="button"
            className="grid size-6 place-items-center rounded-sm text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(node.id);
            }}
            aria-label={expanded ? "收起" : "展开"}
          >
            <ChevronRight className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
          </button>
        ) : (
          <span className="size-6" />
        )}
        {node.type === "folder" ? (
          expanded ? <FolderOpen className={cn("size-3.5 shrink-0", tint)} /> : <Folder className={cn("size-3.5 shrink-0", tint)} />
        ) : (
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {node.starred && <Star className="size-3 fill-primary text-primary" />}
        <RowMenu node={node} />
      </div>
      {node.type === "folder" && expanded && <TreeLevel docs={docs} parentId={node.id} depth={depth + 1} />}
    </li>
  );
}

function RowMenu({ node }: { node: VaultNode }) {
  const renameNode = useVaultStore((s) => s.renameNode);
  const toggleStar = useVaultStore((s) => s.toggleStar);
  const duplicateNode = useVaultStore((s) => s.duplicateNode);
  const trashNodes = useVaultStore((s) => s.trashNodes);
  const shredNodes = useVaultStore((s) => s.shredNodes);
  const createDocument = useVaultStore((s) => s.createDocument);
  const createFolder = useVaultStore((s) => s.createFolder);
  const setTint = useVaultStore((s) => s.setTint);
  const moveNodes = useVaultStore((s) => s.moveNodes);
  const documents = useVaultStore((s) => s.documents);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {node.type === "folder" && (
          <>
            <DropdownMenuItem onSelect={() => createDocument({ parentId: node.id })}>在此新建文档</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => createFolder({ parentId: node.id })}>在此新建文件夹</DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onSelect={() => {
            const name = window.prompt("重命名", node.name);
            if (name) renameNode(node.id, name);
          }}
        >
          重命名
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toggleStar(node.id)}>{node.starred ? "取消星标" : "加星标"}</DropdownMenuItem>
        {node.type === "document" && (
          <DropdownMenuItem onSelect={() => duplicateNode(node.id)}>创建副本</DropdownMenuItem>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>移动到</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onSelect={() => moveNodes([node.id], "")}>根目录</DropdownMenuItem>
            {documents
              .filter((d) => d.type === "folder" && !d.inTrash && d.id !== node.id)
              .map((f) => (
                <DropdownMenuItem key={f.id} onSelect={() => moveNodes([node.id], f.id)}>
                  {f.name}
                </DropdownMenuItem>
              ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {node.type === "folder" && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>文件夹颜色</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {(["slate", "blue", "teal", "rose", "amber"] as const).map((t) => (
                <DropdownMenuItem key={t} onSelect={() => setTint(node.id, t)}>
                  {t}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {node.type === "document" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void exportDocument(node, "md")}>导出 Markdown</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void exportDocument(node, "html")}>导出 HTML</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void exportDocument(node, "docx")}>导出 Word</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void exportDocument(node, "txt")}>导出纯文本</DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => trashNodes([node.id])}>移至回收站</DropdownMenuItem>
        <DropdownMenuItem
          destructive
          onSelect={() => {
            if (window.confirm("彻底粉碎后无法恢复。继续？")) shredNodes([node.id]);
          }}
        >
          彻底粉碎
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
