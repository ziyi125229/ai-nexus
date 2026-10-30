"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/mock/api";
import { formatCurrency, formatDateTime, formatLatency } from "@/lib/format";
import type { CallLogRecord } from "@/types";

export function LogsPage({ initialSearch, initialAppId }: { initialSearch?: string; initialAppId?: string }) {
  const [search, setSearch] = useState(initialSearch ?? "");
  const [appId, setAppId] = useState(initialAppId ?? "all");
  const [callStatus, setCallStatus] = useState("all");
  const [current, setCurrent] = useState<CallLogRecord | null>(null);
  const lookup = api.lookup();
  const query = useMemo(
    () => ({
      search,
      appId: appId === "all" ? undefined : appId,
      callStatus: callStatus === "all" ? undefined : callStatus,
      pageSize: 20,
    }),
    [search, appId, callStatus],
  );
  const { data, loading, error, reload } = useAsync(() => api.listLogs(query), [query]);

  useEffect(() => {
    if (!initialSearch || !data?.items.length) return;
    const hit = data.items.find((item) => item.requestId === initialSearch || item.id === initialSearch || item.traceId === initialSearch);
    if (hit) setCurrent(hit);
  }, [initialSearch, data]);

  return (
    <div>
      <PageHeader title="调用日志" description="Playground 与网关调用共用同一份日志。支持按 requestId / traceId / 应用检索，并从详情跳转到 Trace。" />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="搜索 requestId、traceId、应用或错误信息"
        filters={[
          {
            value: appId,
            onChange: setAppId,
            placeholder: "应用",
            options: [{ value: "all", label: "全部应用" }, ...lookup.apps.map((app) => ({ value: app.id, label: app.name }))],
          },
          {
            value: callStatus,
            onChange: setCallStatus,
            placeholder: "状态",
            options: [
              { value: "all", label: "全部状态" },
              { value: "success", label: "成功" },
              { value: "error", label: "失败" },
              { value: "timeout", label: "超时" },
              { value: "throttled", label: "限流" },
            ],
          },
        ]}
        extra={
          <Button variant="outline" onClick={reload}>
            刷新
          </Button>
        }
      />
      <Card>
        {loading ? (
          <Skeleton className="m-4 h-48" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data?.items.length ? (
          <EmptyState title="没有匹配的调用记录" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>Request ID</TableHead>
                <TableHead>应用</TableHead>
                <TableHead>模型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>延迟</TableHead>
                <TableHead>输入 Token</TableHead>
                <TableHead>输出 Token</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => setCurrent(item)}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(item.time)}</TableCell>
                  <TableCell className="font-mono text-[11px]">{item.requestId}</TableCell>
                  <TableCell>{lookup.apps.find((a) => a.id === item.appId)?.name}</TableCell>
                  <TableCell>{lookup.models.find((m) => m.id === item.modelId)?.displayName}</TableCell>
                  <TableCell>
                    <StatusBadge value={item.status} />
                  </TableCell>
                  <TableCell>{formatLatency(item.latency)}</TableCell>
                  <TableCell>{item.inputTokens}</TableCell>
                  <TableCell>{item.outputTokens}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <Sheet open={!!current} onOpenChange={() => setCurrent(null)}>
        <SheetContent>
          {current ? (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono text-sm">{current.requestId}</SheetTitle>
                <SheetDescription>调用明细 · 与 Trace 共用 requestId / traceId</SheetDescription>
              </SheetHeader>
              <div className="space-y-2 overflow-y-auto px-5 py-4 text-sm">
                <p>
                  状态：<StatusBadge value={current.status} />
                </p>
                <p>应用：{lookup.apps.find((a) => a.id === current.appId)?.name ?? current.appId}</p>
                <p>模型：{lookup.models.find((m) => m.id === current.modelId)?.displayName ?? current.modelId}</p>
                {current.agentId ? <p>Agent：{lookup.agents.find((a) => a.id === current.agentId)?.name ?? current.agentId}</p> : null}
                <p>延迟：{formatLatency(current.latency)}</p>
                <p>
                  Token：输入 {current.inputTokens} / 输出 {current.outputTokens}
                </p>
                <p>费用：{formatCurrency(current.cost, 4)}</p>
                <p className="font-mono text-xs">Trace ID：{current.traceId ?? "无"}</p>
                {current.prompt ? (
                  <div>
                    <div className="text-xs text-muted-foreground">输入</div>
                    <p className="rounded bg-slate-50 p-2 text-xs">{current.prompt}</p>
                  </div>
                ) : null}
                {current.output ? (
                  <div>
                    <div className="text-xs text-muted-foreground">输出</div>
                    <p className="rounded bg-slate-50 p-2 text-xs">{current.output}</p>
                  </div>
                ) : null}
                {current.errorCode ? (
                  <p className="text-destructive">
                    {current.errorCode} · {current.errorMessage}
                  </p>
                ) : null}
                {current.traceId ? (
                  <Button asChild variant="outline">
                    <Link href={`/ops/traces/${current.traceId}`}>查看执行 Trace</Link>
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">该历史采样日志未生成 Trace。Playground 新调用都会写入可跳转的 Trace。</p>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
