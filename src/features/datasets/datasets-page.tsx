"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAsync } from "@/hooks/use-async";
import { api, statusLabel } from "@/mock/api";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { DatasetRecord } from "@/types";

export function DatasetsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [current, setCurrent] = useState<DatasetRecord | null>(null);
  const query = useMemo(
    () => ({ search, status: status === "all" ? undefined : status, type: type === "all" ? undefined : type, pageSize: 20 }),
    [search, status, type],
  );
  const { data, loading, error, reload } = useAsync(() => api.listDatasets(query), [query]);
  const lookup = api.lookup();

  return (
    <div>
      <PageHeader
        title="数据集管理"
        description="管理训练、评测、RAG 和红队数据集。质量分来自抽样标注与自动扫描。"
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="搜索数据集"
        filters={[
          {
            value: status,
            onChange: setStatus,
            placeholder: "状态",
            options: [
              { value: "all", label: "全部状态" },
              { value: "published", label: "已发布" },
              { value: "reviewing", label: "审核中" },
              { value: "draft", label: "草稿" },
            ],
          },
          {
            value: type,
            onChange: setType,
            placeholder: "类型",
            options: [
              { value: "all", label: "全部类型" },
              { value: "sft", label: "SFT" },
              { value: "eval", label: "评测" },
              { value: "rag", label: "RAG" },
              { value: "preference", label: "偏好" },
              { value: "redteam", label: "红队" },
            ],
          },
        ]}
      />
      <Card>
        {loading ? (
          <Skeleton className="m-4 h-40" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data?.items.length ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>数据集</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>样本数</TableHead>
                <TableHead>质量分</TableHead>
                <TableHead>被引用</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <button type="button" className="text-left font-medium hover:text-primary" onClick={() => setCurrent(item)}>
                      {item.name}
                    </button>
                    <div className="text-[11px] text-muted-foreground">{item.sizeGb} GB</div>
                  </TableCell>
                  <TableCell>{statusLabel[item.type]}</TableCell>
                  <TableCell>
                    <StatusBadge value={item.status} />
                  </TableCell>
                  <TableCell>{formatNumber(item.records)}</TableCell>
                  <TableCell>{item.qualityScore}</TableCell>
                  <TableCell>{item.usedBy.length}</TableCell>
                  <TableCell>
                    {item.status === "reviewing" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await api.updateDataset(item.id, { status: "published" });
                          toast.success("数据集已发布");
                          reload();
                        }}
                      >
                        通过审核
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setCurrent(item)}>
                        详情
                      </Button>
                    )}
                  </TableCell>
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
                <SheetTitle>{current.name}</SheetTitle>
                <SheetDescription>{current.description}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 overflow-y-auto px-5 py-4 text-sm">
                <div className="flex gap-2">
                  <StatusBadge value={current.status} />
                  <StatusBadge value={current.type} />
                </div>
                <p>样本 {formatNumber(current.records)} · {current.sizeGb} GB · 质量分 {current.qualityScore}</p>
                <p>负责人 {current.owner.name} · 更新于 {formatDateTime(current.updatedAt)}</p>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">被以下资产引用</div>
                  {current.usedBy.map((id) => {
                    const name =
                      lookup.models.find((m) => m.id === id)?.displayName ??
                      lookup.agents.find((a) => a.id === id)?.name ??
                      lookup.apps.find((a) => a.id === id)?.name ??
                      lookup.tools.find((t) => t.id === id)?.displayName ??
                      id;
                    return <div key={id}>{name}</div>;
                  })}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
