import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatSize, formatStamp } from "@/lib/vault/format";
import { trashDocs } from "@/lib/vault/tree";
import { useVaultStore } from "@/stores/vault-store";

export function TrashDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const documents = useVaultStore((s) => s.documents);
  const restoreNodes = useVaultStore((s) => s.restoreNodes);
  const shredNodes = useVaultStore((s) => s.shredNodes);
  const items = trashDocs(documents);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>回收站</DialogTitle>
          <DialogDescription>
            还原会在原父级不存在时升到根目录。粉碎将从金库中永久移除密文。
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-auto rounded-lg border border-border">
          {items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">回收站是空的</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">名称</th>
                  <th className="px-3 py-2 font-medium">大小</th>
                  <th className="px-3 py-2 font-medium">移入时间</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="px-3 py-2">{d.type === "folder" ? `文件夹 · ${d.name}` : d.name}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {d.type === "folder" ? "—" : formatSize(d.size)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{formatStamp(d.deletedAt || d.updatedAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => restoreNodes([d.id])}>
                        还原
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (window.confirm("彻底粉碎后无法恢复。继续？")) shredNodes([d.id]);
                        }}
                      >
                        粉碎
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {items.length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm("将粉碎回收站内全部项目。继续？")) {
                  shredNodes(items.map((d) => d.id));
                }
              }}
            >
              <Trash2 className="size-3.5" />
              清空并粉碎
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
