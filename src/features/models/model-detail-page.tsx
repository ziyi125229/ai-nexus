"use client";

import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/mock/api";
import { formatCompact, formatCurrency, formatDateTime, formatLatency, formatNumber, formatPercent } from "@/lib/format";

export function ModelDetailPage({ id }: { id: string }) {
  const { data, loading, error, reload } = useAsync(() => api.getModel(id), [id]);
  const lookup = api.lookup();

  if (loading) return <Skeleton className="h-64" />;
  if (error || !data) return <ErrorState message={error ?? "模型不存在"} onRetry={reload} />;

  const consumers = lookup.apps.filter((app) => app.modelIds.includes(data.id));
  const agents = lookup.agents.filter((agent) => agent.modelId === data.id);

  return (
    <div>
      <PageHeader
        title={data.displayName}
        description={data.description}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/developer/playground">在 API 调试中试用</Link>
            </Button>
            {data.status === "reviewing" ? (
              <Button
                onClick={async () => {
                  await api.updateModel(data.id, { status: "published" });
                  toast.success("模型已发布");
                  reload();
                }}
              >
                审核通过并发布
              </Button>
            ) : null}
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge value={data.status} />
        <StatusBadge value={data.type} />
        <span className="text-sm text-muted-foreground">{data.provider} · {data.version}</span>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="30 日调用" value={formatCompact(data.callCount30d)} />
        <Metric label="成功率" value={formatPercent(data.successRate, 2)} />
        <Metric label="P50 / P99" value={`${formatLatency(data.latencyP50)} / ${formatLatency(data.latencyP99)}`} />
        <Metric
          label="价格 (每百万 tokens)"
          value={`${formatCurrency(data.inputPrice, 2)} / ${formatCurrency(data.outputPrice, 2)}`}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>治理信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="模型标识" value={data.name} mono />
            <Info label="上下文窗口" value={formatNumber(data.contextWindow)} />
            <Info label="Endpoint" value={data.endpoint} mono />
            <Info label="负责人" value={`${data.owner.name} · ${data.owner.department}`} />
            <Info label="创建时间" value={formatDateTime(data.createdAt)} />
            <Info label="更新时间" value={formatDateTime(data.updatedAt)} />
            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground">标签</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {data.tags.map((tag) => (
                  <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>下游依赖</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">应用</div>
              {consumers.length ? consumers.map((app) => (
                <Link key={app.id} href={`/developer/apps/${app.id}`} className="block py-1 hover:text-primary">
                  {app.name}
                </Link>
              )) : <p className="text-muted-foreground">暂无应用引用</p>}
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Agent</div>
              {agents.length ? agents.map((agent) => (
                <Link key={agent.id} href={`/assets/agents/${agent.id}`} className="block py-1 hover:text-primary">
                  {agent.name}
                </Link>
              )) : <p className="text-muted-foreground">暂无 Agent 引用</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </Card>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-xs break-all" : ""}>{value}</div>
    </div>
  );
}
