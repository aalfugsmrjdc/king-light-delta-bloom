import { useEffect, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Maximize2,
  Menu,
  PanelRight,
  Printer,
  Settings,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { breadcrumbs, getById } from "@/lib/vault/tree";
import { clipboardGuard } from "@/lib/vault/clipboard";
import { useVaultStore } from "@/stores/vault-store";
import { Sidebar } from "./sidebar";
import { DocumentEditor } from "./editor";
import { Inspector } from "./inspector";
import { Dashboard, FolderView } from "./dashboard";
import { SettingsDialog } from "./settings-dialog";
import { IntroDialog } from "./intro-dialog";
import { CommandPalette } from "./command-palette";

export function AppShell() {
  const status = useVaultStore((s) => s.status);
  const documents = useVaultStore((s) => s.documents);
  const activeId = useVaultStore((s) => s.activeId);
  const zen = useVaultStore((s) => s.zen);
  const inspectorOpen = useVaultStore((s) => s.inspectorOpen);
  const mobileNav = useVaultStore((s) => s.mobileNav);
  const setMobileNav = useVaultStore((s) => s.setMobileNav);
  const bumpActivity = useVaultStore((s) => s.bumpActivity);
  const setCommandOpen = useVaultStore((s) => s.setCommandOpen);
  const setZen = useVaultStore((s) => s.setZen);

  const node = getById(documents, activeId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === "Escape") setZen(false);
      if (meta && e.key.toLowerCase() === "n" && !e.shiftKey) {
        e.preventDefault();
        useVaultStore.getState().createDocument();
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        useVaultStore.getState().createFolder();
      }
      if (meta && e.key.toLowerCase() === "l" && useVaultStore.getState().hasPassword) {
        e.preventDefault();
        void useVaultStore.getState().lock();
      }
    };
    const onAct = () => bumpActivity();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onAct);
    window.addEventListener("keydown", onAct);
    const off = clipboardGuard.on((n) => useVaultStore.setState({ clipboardLeft: n }));
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onAct);
      window.removeEventListener("keydown", onAct);
      off();
    };
  }, [bumpActivity, setCommandOpen, setZen]);

  if (status !== "unlocked") return null;

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground">
      {!zen && <TopBar />}
      <div className="flex min-h-0 flex-1">
        {zen ? (
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            {node?.type === "document" ? <DocumentEditor node={node} /> : <Dashboard />}
          </main>
        ) : (
          <>
            <div className="hidden h-full w-[272px] shrink-0 border-r border-border md:block">
              <Sidebar className="h-full" />
            </div>
            <Sheet open={mobileNav} onOpenChange={setMobileNav}>
              <SheetContent side="left" className="p-0">
                <Sidebar className="h-full pt-8" />
              </SheetContent>
            </Sheet>
            <div className="flex min-w-0 flex-1">
              <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
                <WorkHeader />
                {node?.type === "folder" ? (
                  <FolderView node={node} />
                ) : node?.type === "document" ? (
                  <DocumentEditor node={node} />
                ) : (
                  <Dashboard />
                )}
              </main>
              {inspectorOpen && node && (
                <div className="hidden w-72 shrink-0 lg:block">
                  <Inspector node={node} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <IntroDialog />
      <CommandPalette />
    </div>
  );
}

function TopBar() {
  const hasPassword = useVaultStore((s) => s.hasPassword);
  const lock = useVaultStore((s) => s.lock);
  const setCommandOpen = useVaultStore((s) => s.setCommandOpen);
  const setMobileNav = useVaultStore((s) => s.setMobileNav);
  const importFiles = useVaultStore((s) => s.importFiles);
  const fileRef = useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-2 md:px-3">
      <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={() => setMobileNav(true)} aria-label="打开目录">
        <Menu className="size-4" />
      </Button>
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="hidden h-8 min-w-40 items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 text-xs text-muted-foreground hover:bg-secondary sm:flex"
      >
        命令与搜索
        <span className="ml-auto flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <div className="ml-auto flex items-center gap-1">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".txt,.md,.markdown,.html,.htm,.docx,.json"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void importFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Tip label="导入">
          <Button variant="ghost" size="icon-sm" onClick={() => fileRef.current?.click()} aria-label="导入文档">
            <Upload className="size-4" />
          </Button>
        </Tip>
        <Tip label="设置">
          <Button variant="ghost" size="icon-sm" onClick={() => setSettingsOpen(true)} aria-label="设置">
            <Settings className="size-4" />
          </Button>
        </Tip>
        {hasPassword && (
          <Tip label="锁定">
            <Button variant="ghost" size="icon-sm" onClick={() => void lock()} aria-label="锁定金库">
              <Lock className="size-4" />
            </Button>
          </Tip>
        )}
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}

function WorkHeader() {
  const documents = useVaultStore((s) => s.documents);
  const activeId = useVaultStore((s) => s.activeId);
  const setActive = useVaultStore((s) => s.setActive);
  const renameNode = useVaultStore((s) => s.renameNode);
  const readonly = useVaultStore((s) => s.readonly);
  const setReadonly = useVaultStore((s) => s.setReadonly);
  const inspectorOpen = useVaultStore((s) => s.inspectorOpen);
  const setInspectorOpen = useVaultStore((s) => s.setInspectorOpen);
  const setZen = useVaultStore((s) => s.setZen);
  const persistNow = useVaultStore((s) => s.persistNow);
  const node = getById(documents, activeId);
  const crumbs = node ? breadcrumbs(documents, node.id) : [];

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
      <nav className="hidden min-w-0 items-center gap-1 text-xs text-muted-foreground md:flex">
        <button type="button" className="hover:text-foreground" onClick={() => setActive(null)}>
          金库
        </button>
        {crumbs.map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <span>/</span>
            <button type="button" className="max-w-32 truncate hover:text-foreground" onClick={() => setActive(c.id)}>
              {c.name}
            </button>
          </span>
        ))}
      </nav>
      {node && (
        <Input
          value={node.name}
          onChange={(e) => renameNode(node.id, e.target.value)}
          className="h-8 max-w-56 border-transparent bg-transparent px-2 font-medium shadow-none md:ml-2"
        />
      )}
      <div className="ml-auto flex items-center gap-1">
        {node?.type === "document" && (
          <>
            <Tip label={readonly ? "解锁编辑" : "只读保护"}>
              <Button variant="ghost" size="icon-sm" onClick={() => setReadonly(!readonly)} aria-label="切换只读">
                {readonly ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </Button>
            </Tip>
            <Tip label="打印">
              <Button variant="ghost" size="icon-sm" onClick={() => window.print()} aria-label="打印">
                <Printer className="size-4" />
              </Button>
            </Tip>
          </>
        )}
        <Tip label="禅模式">
          <Button variant="ghost" size="icon-sm" onClick={() => setZen(true)} aria-label="禅模式">
            <Maximize2 className="size-4" />
          </Button>
        </Tip>
        <Tip label="信息栏">
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={() => setInspectorOpen(!inspectorOpen)}
            aria-label="切换信息栏"
          >
            <PanelRight className="size-4" />
          </Button>
        </Tip>
        <Button size="sm" variant="outline" className="hidden h-8 sm:inline-flex" onClick={() => void persistNow()}>
          保存
        </Button>
      </div>
    </div>
  );
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
