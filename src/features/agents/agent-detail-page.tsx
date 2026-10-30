"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/mock/api";
import { formatCompact, formatDateTime, formatLatency, formatPercent } from "@/lib/format";

export function AgentDetailPage({ id }: { id: string }) {
  const { data, loading, error, reload } = useAsync(() => api.getAgent(id), [id]);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const lookup = api.lookup();

  if (loading) return <Skeleton className="h-64" />;
  if (error || !data) return <ErrorState message={error ?? "Agent 不存在"} onRetry={reload} />;

  const model = lookup.models.find((item) => item.id === data.modelId);
  const tools = lookup.tools.filter((item) => data.toolIds.includes(item.id));
  const datasets = lookup.datasets.filter((item) => data.datasetIds.includes(item.id));
  const apps = lookup.apps.filter((item) => item.agentIds.includes(data.id));
  const boundApp = apps[0];

  const nodes = [
    { title: "用户请求", desc: "应用网关鉴权与配额" },
    { title: "Guardrail", desc: "输入安全与隐私扫描" },
    { title: model?.displayName ?? "主模型", desc: "规划 / 生成" },
    { title: tools[0]?.displayName ?? "工具调用", desc: tools.map((t) => t.displayName).join("、") || "无工具" },
    { title: "输出护栏", desc: "引用、拒答与审计落盘" },
  ];

  return (
    <div>
      <PageHeader
        title={data.name}
        description={data.description}
        actions={
          <div className="flex gap-2">
            {boundApp ? (
              <Button asChild variant="outline">
                <Link href={`/developer/playground?appId=${boundApp.id}&agentId=${data.id}`}>去 Playground</Link>
              </Button>
            ) : data.status === "published" ? (
              <Button asChild variant="outline">
                <Link href="/developer/apps">绑定到应用</Link>
              </Button>
            ) : null}
            {data.status !== "published" ? (
              <Button onClick={() => setConfirmPublish(true)}>发布到生产</Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/ops/traces">查看调用链路</Link>
              </Button>
            )}
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge value={data.status} />
        <span className="text-sm text-muted-foreground">
          v{data.version} · {data.owner.department} · {data.owner.name}
        </span>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">30 日调用</div>
          <div className="text-xl font-semibold">{formatCompact(data.callCount30d)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">成功率</div>
          <div className="text-xl font-semibold">{data.successRate ? formatPercent(data.successRate, 2) : "-"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">平均延迟</div>
          <div className="text-xl font-semibold">{data.avgLatency ? formatLatency(data.avgLatency) : "-"}</div>
        </Card>
      </div>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>工作流拓扑</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 overflow-x-auto md:flex-row md:items-center">
          {nodes.map((node, index) => (
            <div key={node.title} className="flex items-center gap-2">
              <div className="min-w-40 rounded-md border bg-slate-50 px-3 py-2">
                <div className="text-sm font-medium">{node.title}</div>
                <div className="text-[11px] text-muted-foreground">{node.desc}</div>
              </div>
              {index < nodes.length - 1 ? <ArrowRight className="hidden size-4 text-muted-foreground md:block" /> : null}
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>绑定模型</CardTitle>
          </CardHeader>
          <CardContent>
            {model ? (
              <Link href={`/assets/models/${model.id}`} className="text-sm hover:text-primary">
                {model.displayName}
                {model.status !== "published" ? <span className="ml-2 text-destructive">未发布</span> : null}
              </Link>
            ) : (
              <span className="text-sm text-destructive">模型不存在或已下线</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>工具</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {tools.length ? tools.map((tool) => <div key={tool.id}>{tool.displayName}</div>) : "未绑定工具"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>数据集 / 应用</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>{datasets.map((d) => d.name).join("、") || "无数据集"}</div>
            <div>
              {apps.map((app) => (
                <Link key={app.id} href={`/developer/apps/${app.id}`} className="mr-2 hover:text-primary">
                  {app.name}
                </Link>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">更新于 {formatDateTime(data.updatedAt)}</div>
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmPublish}
        title="发布 Agent"
        description={`将发布「${data.name}」。发布前会校验主模型和工具是否已发布；成功后总览中的已发布 Agent 数量会同步增加。`}
        confirmText="确认发布"
        onOpenChange={setConfirmPublish}
        onConfirm={async () => {
          try {
            await api.publishAgent(data.id);
            toast.success("已发布到生产");
            setConfirmPublish(false);
            reload();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "发布失败");
          }
        }}
      />
    </div>
  );
}
