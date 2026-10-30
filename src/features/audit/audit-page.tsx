"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/mock/api";
import { formatDateTime } from "@/lib/format";

export function AuditPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const query = useMemo(
    () => ({ search, status: status === "all" ? undefined : status, pageSize: 20 }),
    [search, status],
  );
  const { data, loading, error, reload } = useAsync(() => api.listAudits(query), [query]);
  const lookup = api.lookup();

  return (
    <div>
      <PageHeader title="操作审计" description="记录发布、配额变更、密钥吊销和越权访问。演示中你在各模块的写操作都会追加到这里。" />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="搜索操作、资源或人员"
        filters={[
          {
            value: status,
            onChange: setStatus,
            placeholder: "结果",
            options: [
              { value: "all", label: "全部结果" },
              { value: "success", label: "成功" },
              { value: "denied", label: "拒绝" },
              { value: "failed", label: "失败" },
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
                <TableHead>时间</TableHead>
                <TableHead>操作人</TableHead>
                <TableHead>动作</TableHead>
                <TableHead>资源</TableHead>
                <TableHead>结果</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(item.time)}</TableCell>
                  <TableCell>{lookup.users.find((u) => u.id === item.actorId)?.name ?? item.actorId}</TableCell>
                  <TableCell>
                    <div className="font-medium">{item.action}</div>
                    <div className="text-xs text-muted-foreground">{item.detail}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.resourceType}/{item.resourceId}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={item.result} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.ip}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
