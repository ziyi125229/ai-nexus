"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/mock/api";
import { formatDateTime, formatLatency } from "@/lib/format";

export function TracesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const query = useMemo(
    () => ({ search, status: status === "all" ? undefined : status, pageSize: 20 }),
    [search, status],
  );
  const { data, loading, error, reload } = useAsync(() => api.listTraces(query), [query]);
  const lookup = api.lookup();

  return (
    <div>
      <PageHeader title="链路追踪" description="一次请求从网关、护栏、Agent 规划、工具到模型的完整 span。用于定位超时和权限错误。" />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="搜索 requestId / Trace ID / 日志 ID"
        filters={[
          {
            value: status,
            onChange: setStatus,
            placeholder: "状态",
            options: [
              { value: "all", label: "全部状态" },
              { value: "success", label: "成功" },
              { value: "error", label: "失败" },
              { value: "timeout", label: "超时" },
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
                <TableHead>Request ID</TableHead>
                <TableHead>应用</TableHead>
                <TableHead>模型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>耗时</TableHead>
                <TableHead>Spans</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link href={`/ops/traces/${item.id}`} className="font-mono text-xs hover:text-primary">
                      {item.requestId}
                    </Link>
                  </TableCell>
                  <TableCell>{lookup.apps.find((a) => a.id === item.appId)?.name}</TableCell>
                  <TableCell>{lookup.models.find((m) => m.id === item.modelId)?.displayName}</TableCell>
                  <TableCell>
                    <StatusBadge value={item.status} />
                  </TableCell>
                  <TableCell>{formatLatency(item.durationMs)}</TableCell>
                  <TableCell>{item.spans.length}</TableCell>
                  <TableCell>{formatDateTime(item.startAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
