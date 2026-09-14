import { format, formatDistanceToNow, parseISO, isValid } from "date-fns";
import { zhCN } from "date-fns/locale";

function toDate(value: string): Date | null {
  if (!value) return null;
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const d = parseISO(iso);
  if (isValid(d)) return d;
  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
}

export function formatStamp(value: string): string {
  const d = toDate(value);
  if (!d) return value;
  return format(d, "yyyy-MM-dd HH:mm");
}

export function formatRelative(value: string): string {
  const d = toDate(value);
  if (!d) return value;
  return formatDistanceToNow(d, { addSuffix: true, locale: zhCN });
}

export function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

export function todayTitle(): string {
  return format(new Date(), "yyyy年M月d日 · 手记");
}
