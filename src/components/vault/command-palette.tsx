import { useMemo, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TEMPLATES } from "@/lib/vault/templates";
import { THEME_OPTIONS } from "@/lib/vault/themes";
import { useVaultStore } from "@/stores/vault-store";

export function CommandPalette() {
  const open = useVaultStore((s) => s.commandOpen);
  const setOpen = useVaultStore((s) => s.setCommandOpen);
  const documents = useVaultStore((s) => s.documents);
  const setActive = useVaultStore((s) => s.setActive);
  const createDocument = useVaultStore((s) => s.createDocument);
  const createFolder = useVaultStore((s) => s.createFolder);
  const fromTemplate = useVaultStore((s) => s.fromTemplate);
  const openDailyNote = useVaultStore((s) => s.openDailyNote);
  const lock = useVaultStore((s) => s.lock);
  const setZen = useVaultStore((s) => s.setZen);
  const setTheme = useVaultStore((s) => s.setTheme);
  const setIntroOpen = useVaultStore((s) => s.setIntroOpen);
  const hasPassword = useVaultStore((s) => s.hasPassword);
  const [q, setQ] = useState("");

  const docs = useMemo(
    () =>
      documents.filter(
        (d) => !d.inTrash && d.type === "document" && d.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [documents, q],
  );

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
    setQ("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0">
        <Command className="rounded-xl border-0">
          <CommandInput placeholder="搜索文档或命令…" value={q} onValueChange={setQ} />
          <CommandList>
            <CommandEmpty>没有匹配项</CommandEmpty>
            <CommandGroup heading="操作">
              <CommandItem onSelect={() => run(() => createDocument())}>新建文档</CommandItem>
              <CommandItem onSelect={() => run(() => createFolder())}>新建文件夹</CommandItem>
              <CommandItem onSelect={() => run(() => openDailyNote())}>今日手记</CommandItem>
              <CommandItem onSelect={() => run(() => setZen(true))}>禅模式</CommandItem>
              {hasPassword && <CommandItem onSelect={() => run(() => void lock())}>锁定金库</CommandItem>}
              <CommandItem onSelect={() => run(() => setIntroOpen(true))}>功能介绍</CommandItem>
            </CommandGroup>
            <CommandGroup heading="模板">
              {TEMPLATES.map((t) => (
                <CommandItem key={t.id} onSelect={() => run(() => fromTemplate(t.id))}>
                  {t.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="主题">
              {THEME_OPTIONS.map((t) => (
                <CommandItem key={t.id} onSelect={() => run(() => setTheme(t.id))}>
                  切换到{t.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {docs.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="文档">
                  {docs.slice(0, 12).map((d) => (
                    <CommandItem key={d.id} onSelect={() => run(() => setActive(d.id))}>
                      {d.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
