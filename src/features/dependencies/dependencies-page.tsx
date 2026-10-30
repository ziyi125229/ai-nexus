"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/mock/api";

const kindHref: Record<string, (id: string) => string> = {
  model: (id) => `/assets/models/${id}`,
  agent: (id) => `/assets/agents/${id}`,
  app: (id) => `/developer/apps/${id}`,
  dataset: () => "/assets/datasets",
  tool: () => "/assets/tools",
};

const kindLabel: Record<string, string> = {
  model: "模型",
  dataset: "数据集",
  tool: "工具",
  agent: "Agent",
  app: "应用",
};

export function DependenciesPage() {
  const { data, loading, error, reload } = useAsync(() => api.getDependencies(), []);
  const [kind, setKind] = useState("all");
  const [focus, setFocus] = useState<string>("");

  const nodes = useMemo(() => {
    if (!data) return [];
    return data.nodes.filter((node) => kind === "all" || node.kind === kind);
  }, [data, kind]);

  const related = useMemo(() => {
    if (!data || !focus) return [];
    return data.edges.filter((edge) => edge.from === focus || edge.to === focus);
  }, [data, focus]);

  if (loading) return <Skeleton className="h-80" />;
  if (error || !data) return <ErrorState message={error ?? "无法加载依赖"} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        title="资产依赖关系"
        description="查看模型、数据集、工具、Agent 与应用之间的引用关系，识别单点依赖和高复用资产。"
      />
      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {Object.entries(kindLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>资产图谱（列表视图）</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {nodes.map((node) => {
              const degree = data.edges.filter((e) => e.from === node.id || e.to === node.id).length;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setFocus(node.id)}
                  className={`rounded-md border px-3 py-2 text-left hover:border-primary ${focus === node.id ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{node.name}</span>
                    <span className="text-[11px] text-muted-foreground">{kindLabel[node.kind]}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <StatusBadge value={node.status} />
                    <span className="text-[11px] text-muted-foreground">{degree} 条关系</span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{focus ? "选中资产的关系" : "选择左侧资产"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {focus ? (
              related.length ? (
                related.map((edge, index) => {
                  const from = data.nodes.find((n) => n.id === edge.from);
                  const to = data.nodes.find((n) => n.id === edge.to);
                  return (
                    <div key={`${edge.from}-${edge.to}-${index}`} className="rounded-md border p-2">
                      <div className="text-xs text-muted-foreground">{edge.relation}</div>
                      <div>
                        {from ? (
                          <Link className="hover:text-primary" href={kindHref[from.kind](from.id)}>
                            {from.name}
                          </Link>
                        ) : edge.from}{" "}
                        →{" "}
                        {to ? (
                          <Link className="hover:text-primary" href={kindHref[to.kind](to.id)}>
                            {to.name}
                          </Link>
                        ) : edge.to}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground">该资产暂无依赖边，可能是孤立草稿。</p>
              )
            ) : (
              <p className="text-muted-foreground">点击资产卡片查看谁在使用它、它又依赖谁。高复用模型通常出现在多个应用中。</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
