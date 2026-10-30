import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Bot,
  Boxes,
  Database,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  TerminalSquare,
  Timer,
  Users,
  Wrench,
  AppWindow,
  Wallet,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "工作台",
    items: [{ href: "/dashboard", label: "平台总览", icon: LayoutDashboard }],
  },
  {
    title: "AI 资产中心",
    items: [
      { href: "/assets/models", label: "模型管理", icon: Boxes },
      { href: "/assets/datasets", label: "数据集管理", icon: Database },
      { href: "/assets/tools", label: "工具管理", icon: Wrench },
      { href: "/assets/agents", label: "Agent 管理", icon: Bot },
      { href: "/assets/dependencies", label: "资产依赖关系", icon: GitBranch },
    ],
  },
  {
    title: "开发者平台",
    items: [
      { href: "/developer/apps", label: "应用管理", icon: AppWindow },
      { href: "/developer/playground", label: "API 调试", icon: TerminalSquare },
      { href: "/developer/credentials", label: "API 凭证", icon: KeyRound },
      { href: "/developer/logs", label: "调用日志", icon: ScrollText },
    ],
  },
  {
    title: "智能运维",
    items: [
      { href: "/ops/monitoring", label: "运行监控", icon: Activity },
      { href: "/ops/alerts", label: "告警中心", icon: Bell },
      { href: "/ops/traces", label: "链路追踪", icon: Timer },
      { href: "/ops/cost", label: "成本分析", icon: Wallet },
    ],
  },
  {
    title: "平台管理",
    items: [
      { href: "/admin/users", label: "用户与权限", icon: Users },
      { href: "/admin/audit", label: "操作审计", icon: ShieldCheck },
      { href: "/admin/settings", label: "系统设置", icon: Settings },
    ],
  },
];

export const CURRENT_USER = {
  id: "user-zhang",
  name: "张启明",
  email: "qiming.zhang@xinghe.tech",
  role: "平台管理员",
  department: "平台工程部",
};

export function findNavLabel(pathname: string): { group: string; label: string } {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return { group: group.title, label: item.label };
      }
    }
  }
  return { group: "工作台", label: "平台总览" };
}
