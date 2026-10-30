"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/mock/api";
import { formatCurrency, formatPercent } from "@/lib/format";

const COLORS = ["#1d4ed8", "#7c3aed", "#059669", "#d97706", "#0f766e", "#be123c"];

export function CostPage() {
  const { data, loading, error, reload } = useAsync(() => api.getCost(), []);

  if (loading) return <Skeleton className="h-80" />;
  if (error || !data) return <ErrorState message={error ?? "成本数据加载失败"} onRetry={reload} />;

  const usage = (data.monthCost / data.budget) * 100;

  return (
    <div>
      <PageHeader
        title="成本分析"
        description="按模型、应用和部门拆分 Token 成本。预算来自系统设置，可在演示中调整后回到本页查看。"
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">本月估算成本</div>
          <div className="text-2xl font-semibold">{formatCurrency(data.monthCost, 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">月度预算</div>
          <div className="text-2xl font-semibold">{formatCurrency(data.budget, 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">预算使用率</div>
          <div className="text-2xl font-semibold">{formatPercent(usage, 1)}</div>
        </Card>
      </div>
      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>模型成本</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byModel.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="cost" fill="#1d4ed8" name="成本" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>部门分摊</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.byDept} dataKey="cost" nameKey="name" innerRadius={48} outerRadius={80}>
                  {data.byDept.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>应用成本明细</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>应用</TableHead>
                <TableHead>部门</TableHead>
                <TableHead>30 日成本</TableHead>
                <TableHead>月预算</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byApp.map((item) => (
                <TableRow key={item.name}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.owner}</TableCell>
                  <TableCell>{formatCurrency(item.cost, 0)}</TableCell>
                  <TableCell>{formatCurrency(item.budget, 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
