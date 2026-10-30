"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/mock/api";
import { formatDateTime, formatLatency } from "@/lib/format";
import { cn } from "@/lib/utils";

const colors: Record<string, string> = {
  gateway: "bg-slate-700",
  guardrail: "bg-violet-600",
  agent: "bg-indigo-600",
  model: "bg-blue-700",
  tool: "bg-emerald-600",
  retrieval: "bg-cyan-700",
  output: "bg-teal-700",
};

export function TraceDetailPage({ id }: { id: string }) {
  const { data, loading, error, reload } = useAsync(() => api.getTrace(id), [id]);
  const lookup = api.lookup();

  if (loading) return <Skeleton className="h-64" />;
  if (error || !data) return <ErrorState message={error ?? "链路不存在"} onRetry={reload} />;

  const total = Math.max(data.durationMs, 1);
  const appName = lookup.apps.find((a) => a.id === data.appId)?.name ?? data.appId;
  const failed = data.spans.some((span) => span.status !== "success");

  return (
    <div>
      <PageHeader
        title={data.requestId}
        description={`${appName} · ${formatDateTime(data.startAt)}`}
        actions={
          <div className="flex gap-2">
            {data.logId ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/developer/logs?requestId=${data.requestId}`}>查看调用日志</Link>
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="sm">
              <Link href="/ops/traces">返回列表</Link>
            </Button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge value={data.status} />
        <Badge variant="warning">Mock Trace</Badge>
        <span className="text-sm text-muted-foreground">总耗时 {formatLatency(data.durationMs)}</span>
        {failed ? <span className="text-sm text-destructive">存在失败节点</span> : null}
      </div>
      {data.prompt ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>用户输入</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{data.prompt}</CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>执行链路</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.spans.map((span) => {
            const isFailed = span.status !== "success";
            return (
              <div
                key={span.id}
                className={cn("rounded-md border p-3", isFailed && "border-destructive/40 bg-red-50")}
              >
                <div className="grid gap-2 md:grid-cols-[180px_1fr_auto] md:items-center">
                  <div>
                    <div className="text-sm font-medium">{span.name}</div>
                    <div className="text-[11px] text-muted-foreground">{span.type}</div>
                  </div>
                  <div className="relative h-7 rounded bg-slate-100">
                    <div
                      className={`absolute top-1 h-5 rounded ${isFailed ? "bg-red-600" : colors[span.type] ?? "bg-primary"}`}
                      style={{
                        left: `${(span.startMs / total) * 100}%`,
                        width: `${Math.max((span.durationMs / total) * 100, 2)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <StatusBadge value={span.status} />
                    {formatLatency(span.durationMs)}
                  </div>
                </div>
                <dl className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">开始时间</dt>
                    <dd>{span.startedAt ? formatDateTime(span.startedAt) : formatDateTime(data.startAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">执行耗时</dt>
                    <dd>{formatLatency(span.durationMs)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">输入摘要</dt>
                    <dd>{span.inputSummary ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">输出摘要</dt>
                    <dd>{span.outputSummary ?? "—"}</dd>
                  </div>
                  {span.errorMessage ? (
                    <div className="md:col-span-2">
                      <dt className="text-muted-foreground">错误信息</dt>
                      <dd className="text-destructive">{span.errorMessage}</dd>
                    </div>
                  ) : null}
                </dl>
                {isFailed ? <p className="mt-2 text-xs font-medium text-destructive">失败节点</p> : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
      {data.output ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>最终输出</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">{data.output}</pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
