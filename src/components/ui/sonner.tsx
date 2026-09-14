import { Toaster as Sonner } from "sonner";
import { useVaultStore } from "@/stores/vault-store";

export function Toaster() {
  const theme = useVaultStore((s) => s.settings.theme);
  return (
    <Sonner
      theme={theme === "paper" ? "light" : "dark"}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "border-border bg-card text-card-foreground",
        },
      }}
    />
  );
}
