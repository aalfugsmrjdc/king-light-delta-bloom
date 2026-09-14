import { cn } from "@/lib/utils";

export function MixiaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("text-primary", className)} aria-hidden>
      <rect x="6.5" y="4.5" width="19" height="23" rx="3.5" fill="currentColor" opacity="0.12" />
      <path
        d="M9 6.5h14a2.5 2.5 0 0 1 2.5 2.5v16a2.5 2.5 0 0 1-2.5 2.5H9A2.5 2.5 0 0 1 6.5 25V9A2.5 2.5 0 0 1 9 6.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M11 12.5h10M11 16.5h7M11 20.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="22" cy="22" r="5.2" className="fill-background" />
      <circle cx="22" cy="22" r="4.4" fill="currentColor" />
      <path d="M22 20.2v2.4M20.6 21.4h2.8" stroke="var(--accent-fg)" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function MixiaWordmark({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <MixiaMark className="size-8" />
      <div className="min-w-0 leading-tight">
        <div className="font-display text-[15px] font-semibold tracking-tight text-foreground">密匣</div>
        {!compact && <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Mixia</div>}
      </div>
    </div>
  );
}
