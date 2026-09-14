import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVaultStore } from "@/stores/vault-store";

const SECTIONS = [
  {
    title: "工业级本地加密",
    body: "AES-256-GCM 认证加密，PBKDF2 十万次迭代派生密钥。磁盘上只保留 nonce 与密文。",
  },
  {
    title: "剪贴板与误触防护",
    body: "复制后按设定秒数清除剪贴板；可为既有文档打开只读锁，避免手滑改写。",
  },
  {
    title: "结构化写作",
    body: "标题、任务清单、高亮、链接、代码块、大纲与历史快照。支持导入 txt / md / docx / html，导出 Markdown、HTML、Word 与金库备份。",
  },
  {
    title: "树状金库",
    body: "无限层级文件夹、拖拽移动、星标、标签与全文检索。回收站可还原，粉碎后从存储中移除。",
  },
];

export function IntroDialog() {
  const open = useVaultStore((s) => s.introOpen);
  const setIntroOpen = useVaultStore((s) => s.setIntroOpen);
  return (
    <Dialog open={open} onOpenChange={setIntroOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>密匣 · 功能概览</DialogTitle>
          <DialogDescription>演示金库已就绪。数据只写在这台设备的浏览器里。</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3">
          {SECTIONS.map((s, i) => (
            <li key={s.title} className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium">
                {i + 1}. {s.title}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
        <DialogFooter>
          <Button onClick={() => setIntroOpen(false)}>开始使用</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
