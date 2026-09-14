import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { THEME_OPTIONS, CANVAS_PRESETS } from "@/lib/vault/themes";
import { exportVaultJson } from "@/lib/vault/exporters";
import { useVaultStore } from "@/stores/vault-store";

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const settings = useVaultStore((s) => s.settings);
  const hasPassword = useVaultStore((s) => s.hasPassword);
  const patchSettings = useVaultStore((s) => s.patchSettings);
  const setTheme = useVaultStore((s) => s.setTheme);
  const setCanvas = useVaultStore((s) => s.setCanvas);
  const setPassword = useVaultStore((s) => s.setPassword);
  const clearPassword = useVaultStore((s) => s.clearPassword);
  const documents = useVaultStore((s) => s.documents);
  const expandedIds = useVaultStore((s) => s.expandedIds);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const savePassword = async () => {
    if (next && next !== confirm) {
      toast.error("两次输入的新密码不一致");
      return;
    }
    if (!next) {
      const ok = await clearPassword(current);
      toast[ok ? "success" : "error"](ok ? "已移除主密码" : "当前密码不正确");
      return;
    }
    const ok = await setPassword(current, next);
    if (ok) {
      toast.success("主密码已更新");
      setCurrent("");
      setNext("");
      setConfirm("");
    } else toast.error("当前密码不正确");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,640px)] overflow-auto">
        <DialogHeader>
          <DialogTitle>功能与安全设置</DialogTitle>
          <DialogDescription>主题、剪贴板自毁、自动锁定与主密码。设置保存在本机。</DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <Label>界面主题</Label>
          <div className="grid grid-cols-2 gap-2">
            {THEME_OPTIONS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  settings.theme === t.id ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                }`}
              >
                <div className="font-medium">{t.label}</div>
                <div className="text-xs text-muted-foreground">{t.hint}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <Label>剪贴板自毁</Label>
          <Select
            value={String(settings.clipboardTimeout)}
            onValueChange={(v) => patchSettings({ clipboardTimeout: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">关闭</SelectItem>
              <SelectItem value="15">15 秒</SelectItem>
              <SelectItem value="30">30 秒</SelectItem>
              <SelectItem value="60">60 秒</SelectItem>
              <SelectItem value="120">120 秒</SelectItem>
            </SelectContent>
          </Select>
        </section>

        <section className="space-y-2">
          <Label>无操作自动锁定</Label>
          <Select
            value={String(settings.autoLockMinutes)}
            onValueChange={(v) => patchSettings({ autoLockMinutes: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">关闭</SelectItem>
              <SelectItem value="5">5 分钟</SelectItem>
              <SelectItem value="10">10 分钟</SelectItem>
              <SelectItem value="15">15 分钟</SelectItem>
              <SelectItem value="30">30 分钟</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">仅在已设置主密码时生效。</p>
        </section>

        <section className="flex items-center justify-between gap-4">
          <div>
            <Label>打开文档时只读锁定</Label>
            <p className="text-xs text-muted-foreground">防止误改既有正文</p>
          </div>
          <Switch
            checked={settings.defaultReadonly}
            onCheckedChange={(v) => patchSettings({ defaultReadonly: v })}
          />
        </section>

        <section className="space-y-2">
          <Label>编辑器画布</Label>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant={settings.canvas.mode === "default" ? "default" : "outline"} onClick={() => setCanvas({ mode: "default", bg: "", fg: "" })}>
              跟随主题
            </Button>
            {CANVAS_PRESETS.map((p) => (
              <Button
                key={p.mode}
                size="sm"
                variant={settings.canvas.mode === p.mode ? "default" : "outline"}
                onClick={() => setCanvas({ mode: p.mode, bg: p.bg, fg: p.fg })}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-2 border-t border-border pt-4">
          <Label>主访问密码 {hasPassword ? "（已启用）" : "（未设置）"}</Label>
          {hasPassword && (
            <Input type="password" placeholder="当前密码" value={current} onChange={(e) => setCurrent(e.target.value)} />
          )}
          <Input type="password" placeholder="新密码（留空则移除密码）" value={next} onChange={(e) => setNext(e.target.value)} />
          <Input type="password" placeholder="确认新密码" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <Button variant="outline" onClick={() => void savePassword()}>
            保存密码设置
          </Button>
        </section>

        <section className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={() =>
              exportVaultJson({
                documents,
                expandedIds,
                savedAt: new Date().toISOString(),
              })
            }
          >
            导出金库备份
          </Button>
          <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-border px-3 text-sm hover:bg-secondary">
            导入备份
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const payload = JSON.parse(await file.text());
                  await useVaultStore.getState().restoreBackup(payload, "merge");
                } catch {
                  toast.error("无法解析备份文件");
                }
                e.target.value = "";
              }}
            />
          </label>
        </section>
      </DialogContent>
    </Dialog>
  );
}
