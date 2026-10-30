export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 100_000_000) {
    return `${formatNumber(value / 100_000_000, 2)} 亿`;
  }
  if (Math.abs(value) >= 10_000) {
    return `${formatNumber(value / 10_000, 1)} 万`;
  }
  return formatNumber(value);
}

export function formatPercent(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`;
}

export function formatCurrency(value: number, digits = 2): string {
  return `¥${formatNumber(value, digits)}`;
}

export function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${Math.round(ms)} ms`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatRelative(iso: string, now = new Date()): string {
  const delta = now.getTime() - new Date(iso).getTime();
  const minutes = Math.round(delta / 60_000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} 天前`;
  return formatDateTime(iso);
}

export function formatChange(value: number, unit: "percent" | "pp" | "count" = "percent"): string {
  const sign = value > 0 ? "+" : "";
  if (unit === "pp") return `${sign}${value.toFixed(2)}pp`;
  if (unit === "count") return `${sign}${formatNumber(value)}`;
  return `${sign}${value.toFixed(1)}%`;
}

export function maskSecret(value: string, visible = 4): string {
  if (value.length <= visible) return "••••••••";
  return `${value.slice(0, visible)}${"•".repeat(18)}`;
}
