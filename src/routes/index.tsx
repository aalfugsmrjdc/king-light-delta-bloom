import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/vault/app-shell";
import { BootScreen, LockScreen } from "@/components/vault/lock-screen";
import { useVaultStore } from "@/stores/vault-store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const status = useVaultStore((s) => s.status);
  const boot = useVaultStore((s) => s.boot);

  useEffect(() => {
    void boot();
  }, [boot]);

  return (
    <TooltipProvider delayDuration={250}>
      {status === "boot" && <BootScreen />}
      {status === "locked" && <LockScreen />}
      {status === "unlocked" && <AppShell />}
      <Toaster />
    </TooltipProvider>
  );
}
