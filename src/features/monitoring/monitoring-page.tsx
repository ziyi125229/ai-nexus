"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/mock/api";
import { formatCompact, formatCurrency, formatLatency, formatPercent } from "@/lib/format";
import type { TimeRange } from "@/types";

export function MonitoringPage() {
  const [range, setRange] = useState<TimeRange>("7d");
  const { data, loading, error, reload } = useAsync(() => api.getMonitoring(range), [range]);

  if (loading && !data) return <Skeleton className="h-80" />;
  if (error || !data) return <ErrorState message={error ?? "监控加载失败"} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        title="运行监控"
        description="按模型和应用观察延迟、成功率和配额使用。用于值班巡检和容量规划。"
        actions={
          <div className="flex rounded-md border bg-white p-0.5">
            {(["24h", "7d", "30d"] as TimeRange[]).map((item) => (
              <Button key={item} size="sm" variant={range === item ? "default" : "ghost"} onClick={() => setRange(item)}>
                {item}
              </Button>
            ))}
          </div>
        }
      />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>平台延迟与成功率</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis yAxisId="l" domain={[96, 100]} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line yAxisId="l" type="monotone" dataKey="successRate" name="成功率" stroke="#059669" dot={false} />
              <Line yAxisId="r" type="monotone" dataKey="latencyP95" name="P95" stroke="#d97706" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>模型健康</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>模型</TableHead>
                  <TableHead>P50</TableHead>
                  <TableHead>P99</TableHead>
                  <TableHead>成功率</TableHead>
                  <TableHead>调用</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byModel.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{formatLatency(item.latencyP50)}</TableCell>
                    <TableCell>{formatLatency(item.latencyP99)}</TableCell>
                    <TableCell>{formatPercent(item.successRate, 2)}</TableCell>
                    <TableCell>{formatCompact(item.calls)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>应用配额</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>应用</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>今日消耗</TableHead>
                  <TableHead>QPS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byApp.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <StatusBadge value={item.status} />
                    </TableCell>
                    <TableCell>
                      {formatCurrency(item.spentToday, 0)} / {formatCurrency(item.dailyBudget, 0)}
                    </TableCell>
                    <TableCell>{item.qpsLimit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
