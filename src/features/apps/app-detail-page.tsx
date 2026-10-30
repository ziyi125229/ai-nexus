"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api, statusLabel } from "@/mock/api";
import { formatCompact, formatCurrency, formatPercent } from "@/lib/format";

export function AppDetailPage({ id }: { id: string }) {
  const { data, loading, error, reload } = useAsync(() => api.getApp(id), [id]);
  const [qps, setQps] = useState<string>();
  const [budget, setBudget] = useState<string>();
  const [confirmOffline, setConfirmOffline] = useState(false);
  const lookup = api.lookup();

  if (loading) return <Skeleton className="h-64" />;
  if (error || !data) return <ErrorState message={error ?? "应用不存在"} onRetry={reload} />;

  const models = data.modelIds.map((mid) => lookup.models.find((m) => m.id === mid)).filter(Boolean);
  const agents = data.agentIds.map((aid) => lookup.agents.find((a) => a.id === aid)).filter(Boolean);

  return (
    <div>
      <PageHeader
        title={data.name}
        description={data.description}
        actions={
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/developer/playground?appId=${data.id}`}>去 Playground</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/developer/credentials">管理凭证</Link>
            </Button>
            {data.status === "online" ? (
              <Button variant="ghost" onClick={() => setConfirmOffline(true)}>
                下线
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={async () => {
                  await api.updateApp(data.id, { status: "online" });
                  toast.success("应用已恢复运行");
                  reload();
                }}
              >
                恢复运行
              </Button>
            )}
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge value={data.status} />
        <StatusBadge value={data.env} />
        <span className="text-sm text-muted-foreground">
          {data.owner.department} · {data.owner.name}
        </span>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">30 日调用</div>
          <div className="text-xl font-semibold">{formatCompact(data.callCount30d)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">成功率</div>
          <div className="text-xl font-semibold">{formatPercent(data.successRate, 2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">今日消耗</div>
          <div className="text-xl font-semibold">{formatCurrency(data.spentToday, 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">环境</div>
          <div className="text-xl font-semibold">{statusLabel[data.env]}</div>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>配额与预算</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>QPS 上限</Label>
              <Input value={qps ?? String(data.qpsLimit)} onChange={(e) => setQps(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>日预算（元）</Label>
              <Input value={budget ?? String(data.dailyBudget)} onChange={(e) => setBudget(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button
                onClick={async () => {
                  await api.updateApp(data.id, {
                    qpsLimit: Number(qps ?? data.qpsLimit),
                    dailyBudget: Number(budget ?? data.dailyBudget),
                  });
                  toast.success("配额已更新");
                  reload();
                }}
              >
                保存变更
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>绑定资产</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">模型</div>
              {models.length
                ? models.map((model) =>
                    model ? (
                      <Link key={model.id} href={`/assets/models/${model.id}`} className="block py-0.5 hover:text-primary">
                        {model.displayName}
                        {model.status !== "published" ? <span className="ml-2 text-destructive">已下线</span> : null}
                      </Link>
                    ) : null,
                  )
                : "未绑定模型"}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Agent</div>
              {agents.length
                ? agents.map((agent) =>
                    agent ? (
                      <Link key={agent.id} href={`/assets/agents/${agent.id}`} className="block py-0.5 hover:text-primary">
                        {agent.name}
                      </Link>
                    ) : null,
                  )
                : "未绑定 Agent"}
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/developer/logs?appId=${data.id}`}>查看该应用调用日志</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmOffline}
        title="下线应用"
        description={`确认将「${data.name}」设为维护中？维护中的应用无法在 Playground 中调用。`}
        confirmText="确认下线"
        destructive
        onOpenChange={setConfirmOffline}
        onConfirm={async () => {
          await api.updateApp(data.id, { status: "maintenance" });
          toast.success("应用已进入维护");
          setConfirmOffline(false);
          reload();
        }}
      />
    </div>
  );
}
