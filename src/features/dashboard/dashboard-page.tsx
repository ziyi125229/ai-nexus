"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/mock/api";
import { formatCompact, formatCurrency, formatNumber, formatPercent, formatRelative } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import type { TimeRange } from "@/types";

const ranges: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "近 24 小时" },
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
];

export function DashboardPage() {
  const [range, setRange] = useState<TimeRange>("7d");
  const { data, loading, error, reload } = useAsync(() => api.getOverview(range), [range]);

  if (loading && !data) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? "无法加载总览"} onRetry={reload} />;
  }

  return (
    <div>
      <PageHeader
        title="平台总览"
        badge={<Badge variant="secondary">{BRAND.demoLabel}</Badge>}
        description={`${BRAND.name}（${BRAND.subtitle}）是${BRAND.positioning}。当前为面向「${BRAND.company}」产品经理（平台方向）岗位的概念原型，用于展示信息架构与交互，不代表公司已上线的正式业务系统。页面数据来自 Mock Service。`}
        actions={
          <div className="flex rounded-md border bg-white p-0.5">
            {ranges.map((item) => (
              <Button
                key={item.value}
                size="sm"
                variant={range === item.value ? "default" : "ghost"}
                onClick={() => setRange(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-6">
        {data.health.firingAlerts > 0 ? (
          <Card className="col-span-2 border-amber-200 bg-amber-50/60 p-3 xl:col-span-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                当前有 <b>{data.health.firingAlerts}</b> 条未恢复告警；已发布模型 {data.health.modelsOnline}/
                {data.health.modelsTotal}，在线应用 {data.health.appsOnline}，已发布 Agent {data.health.agentsPublished}。
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href="/ops/alerts">查看告警中心</Link>
              </Button>
            </div>
          </Card>
        ) : null}
        {data.kpis.map((kpi) => (
          <div key={kpi.key} className="col-span-1 xl:col-span-1">
            <KpiCard metric={kpi} />
          </div>
        ))}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>调用量与 Token 趋势</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCompact(v)} />
                <Tooltip
                  formatter={(value, name) => [
                    formatCompact(Number(value)),
                    name === "calls" ? "调用次数" : "Token",
                  ]}
                />
                <Area type="monotone" dataKey="calls" stroke="#1d4ed8" fill="#1d4ed8" fillOpacity={0.12} name="calls" />
                <Area type="monotone" dataKey="tokens" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.08} name="tokens" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>成功率与 P95 延迟</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis yAxisId="l" tick={{ fontSize: 11 }} domain={[96, 100]} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line yAxisId="l" type="monotone" dataKey="successRate" stroke="#059669" dot={false} name="成功率 %" />
                <Line yAxisId="r" type="monotone" dataKey="latencyP95" stroke="#d97706" dot={false} name="P95 ms" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>模型调用分布</CardTitle>
            <Button asChild variant="link" size="sm">
              <Link href="/assets/models">模型管理</Link>
            </Button>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.modelUsage} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCompact(v)} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatNumber(Number(value))} />
                <Bar dataKey="calls" fill="#1d4ed8" radius={[0, 3, 3, 0]} name="调用次数" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>待处理事项</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.alerts.map((alert) => (
              <Link key={alert.id} href="/ops/alerts" className="block rounded-md border px-3 py-2 hover:bg-muted/50">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <StatusBadge value={alert.severity} />
                  <span className="text-[11px] text-muted-foreground">{formatRelative(alert.firedAt)}</span>
                </div>
                <p className="text-sm font-medium">{alert.title}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>应用调用排行</CardTitle>
            <Button asChild variant="link" size="sm">
              <Link href="/developer/apps">应用管理</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>应用</TableHead>
                  <TableHead>30 日调用</TableHead>
                  <TableHead>成功率</TableHead>
                  <TableHead>估算成本</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.appRanking.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <Link href={`/developer/apps/${app.id}`} className="font-medium hover:text-primary">
                        {app.name}
                      </Link>
                    </TableCell>
                    <TableCell>{formatNumber(app.calls)}</TableCell>
                    <TableCell>{formatPercent(app.successRate, 1)}</TableCell>
                    <TableCell>{formatCurrency(app.cost, 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>最近操作</CardTitle>
            <Button asChild variant="link" size="sm">
              <Link href="/admin/audit">操作审计</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.activities.map((item) => (
              <div key={item.id} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.action}</span>
                  <StatusBadge value={item.result} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.detail} · {formatRelative(item.time)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
