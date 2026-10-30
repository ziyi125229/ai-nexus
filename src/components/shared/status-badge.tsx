import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/mock/api";

const variantMap: Record<string, "success" | "warning" | "destructive" | "info" | "secondary" | "violet" | "default"> = {
  published: "success",
  online: "success",
  active: "success",
  success: "success",
  resolved: "success",
  reviewing: "warning",
  expiring: "warning",
  degraded: "warning",
  ack: "warning",
  warning: "warning",
  maintenance: "warning",
  invited: "warning",
  draft: "secondary",
  offline: "secondary",
  disabled: "secondary",
  deprecated: "secondary",
  rotated: "secondary",
  info: "info",
  firing: "destructive",
  critical: "destructive",
  error: "destructive",
  timeout: "destructive",
  throttled: "warning",
  denied: "destructive",
  failed: "destructive",
  revoked: "destructive",
};

export function StatusBadge({ value }: { value: string }) {
  return <Badge variant={variantMap[value] ?? "secondary"}>{statusLabel[value] ?? value}</Badge>;
}
