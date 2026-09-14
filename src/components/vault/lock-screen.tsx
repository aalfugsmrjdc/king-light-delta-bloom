import { useState } from "react";
import { Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MixiaMark } from "./logo";
import { useVaultStore } from "@/stores/vault-store";

export function LockScreen() {
  const unlock = useVaultStore((s) => s.unlock);
  const resetVault = useVaultStore((s) => s.resetVault);
  const bootError = useVaultStore((s) => s.bootError);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const ok = await unlock(password);
    setBusy(false);
    if (!ok) {
      setError("密码不正确，无法解密金库。");
      setPassword("");
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-5 py-12 text-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-24 top-10 size-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-10 bottom-0 size-[22rem] rounded-full bg-primary/5 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <MixiaMark className="mb-4 size-14" />
          <h1 className="font-display text-3xl font-semibold tracking-tight text-balance">密匣</h1>
          <p className="mt-2 text-sm text-muted-foreground">本地加密文档工作台 · AES-256-GCM</p>
        </div>
        <form
          onSubmit={submit}
          className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-border)]"
        >
          <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Shield className="size-3.5" />
            金库已锁定
          </div>
          {bootError && <p className="mb-3 text-sm text-destructive">{bootError}</p>}
          <Input
            autoFocus
            type="password"
            placeholder="输入主访问密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11"
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="mt-4 h-11 w-full" disabled={busy || !password}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            解锁
          </Button>
          <button
            type="button"
            className="mt-4 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
            onClick={() => {
              if (window.confirm("重置会抹去本机金库内全部密文与密码，且不可恢复。确定继续？")) {
                void resetVault();
              }
            }}
          >
            忘记密码，重置金库
          </button>
        </form>
        <ul className="mt-8 space-y-2 text-center text-xs text-muted-foreground">
          <li>正文只在本机解密，不会离开这台设备</li>
          <li>忘记密码后密文无法还原，只能重建金库</li>
        </ul>
      </div>
    </div>
  );
}

export function BootScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background text-foreground">
      <MixiaMark className="mb-4 size-12 animate-pulse" />
      <p className="text-sm text-muted-foreground">正在打开金库…</p>
    </div>
  );
}
