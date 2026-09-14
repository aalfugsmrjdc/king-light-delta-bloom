function normalize(s: string): string {
  return s.replace(/\u2029/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

type Listener = (remaining: number) => void;

class ClipboardGuard {
  private timer: number | null = null;
  private lastHash: string | null = null;
  remaining = 0;
  private listeners = new Set<Listener>();

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    for (const fn of this.listeners) fn(this.remaining);
  }

  async arm(text: string, timeoutSeconds: number) {
    const norm = normalize(text);
    if (!norm || timeoutSeconds <= 0) return;
    this.lastHash = await sha256Hex(norm);
    this.remaining = timeoutSeconds;
    this.emit();
    if (this.timer) window.clearInterval(this.timer);
    this.timer = window.setInterval(() => {
      this.remaining -= 1;
      if (this.remaining > 0) {
        this.emit();
      } else {
        void this.clearIfMatch();
      }
    }, 1000);
  }

  private async clearIfMatch() {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    try {
      const current = await navigator.clipboard.readText();
      const norm = normalize(current);
      if (norm && this.lastHash && (await sha256Hex(norm)) === this.lastHash) {
        await navigator.clipboard.writeText("");
      }
    } catch {
      /* clipboard permission may be denied */
    }
    this.remaining = 0;
    this.lastHash = null;
    this.emit();
  }

  disarm() {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.remaining = 0;
    this.lastHash = null;
    this.emit();
  }
}

export const clipboardGuard = new ClipboardGuard();
