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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api, statusLabel } from "@/mock/api";
import { formatCompact, formatLatency, formatPercent } from "@/lib/format";
import type { ToolRecord } from "@/types";

export function ToolsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [current, setCurrent] = useState<ToolRecord | null>(null);
  const query = useMemo(
    () => ({ search, status: status === "all" ? undefined : status, type: type === "all" ? undefined : type, pageSize: 20 }),
    [search, status, type],
  );
  const { data, loading, error, reload } = useAsync(() => api.listTools(query), [query]);

  return (
    <div>
      <PageHeader title="工具管理" description="Agent 可调用的 HTTP、Function、MCP 与检索工具。发布前需完成鉴权、超时和失败重试策略。" />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="搜索工具名或标识"
        filters={[
          {
            value: status,
            onChange: setStatus,
            placeholder: "状态",
            options: [
              { value: "all", label: "全部状态" },
              { value: "published", label: "已发布" },
              { value: "reviewing", label: "审核中" },
            ],
          },
          {
            value: type,
            onChange: setType,
            placeholder: "类型",
            options: [
              { value: "all", label: "全部类型" },
              { value: "http", label: "HTTP" },
              { value: "function", label: "Function" },
              { value: "mcp", label: "MCP" },
              { value: "retrieval", label: "Retrieval" },
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
                <TableHead>工具</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>30 日调用</TableHead>
                <TableHead>成功率</TableHead>
                <TableHead>P50</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <button type="button" className="text-left font-medium hover:text-primary" onClick={() => setCurrent(item)}>
                      {item.displayName}
                    </button>
                    <div className="font-mono text-[11px] text-muted-foreground">{item.name}</div>
                  </TableCell>
                  <TableCell>{statusLabel[item.type]}</TableCell>
                  <TableCell>
                    <StatusBadge value={item.status} />
                  </TableCell>
                  <TableCell>{formatCompact(item.callCount30d)}</TableCell>
                  <TableCell>{formatPercent(item.successRate, 1)}</TableCell>
                  <TableCell>{formatLatency(item.latencyP50)}</TableCell>
                  <TableCell>
                    {item.status === "reviewing" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await api.updateTool(item.id, { status: "published" });
                          toast.success("工具已发布");
                          reload();
                        }}
                      >
                        通过审核
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setCurrent(item)}>
                        Schema
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
                <SheetTitle>{current.displayName}</SheetTitle>
                <SheetDescription>{current.description}</SheetDescription>
              </SheetHeader>
              <div className="space-y-3 overflow-y-auto px-5 py-4 text-sm">
                <StatusBadge value={current.status} />
                {current.endpoint ? <p className="font-mono text-xs break-all">{current.endpoint}</p> : null}
                <pre className="overflow-x-auto rounded-md bg-slate-50 p-3 font-mono text-xs">{current.schemaPreview}</pre>
                <p className="text-muted-foreground">被 {current.usedBy.length} 个资产引用</p>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
