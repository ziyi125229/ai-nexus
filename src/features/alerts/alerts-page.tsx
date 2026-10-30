"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/mock/api";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { AlertRecord } from "@/types";

export function AlertsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [current, setCurrent] = useState<AlertRecord | null>(null);
  const [note, setNote] = useState("");
  const [pendingResolve, setPendingResolve] = useState<AlertRecord | null>(null);
  const query = useMemo(
    () => ({ search, status: status === "all" ? undefined : status, type: severity === "all" ? undefined : severity, pageSize: 20 }),
    [search, status, severity],
  );
  const { data, loading, error, reload } = useAsync(() => api.listAlerts(query), [query]);

  const refreshCurrent = async (id: string) => {
    const next = await api.getAlert(id);
    if (next) setCurrent(next);
    reload();
  };

  return (
    <div>
      <PageHeader title="告警中心" description="覆盖延迟、成功率、预算和 Playground 模拟失败。处理状态与备注会写入本地存储，刷新后不会丢失。" />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="搜索告警标题、日志或 Trace"
        filters={[
          {
            value: status,
            onChange: setStatus,
            placeholder: "状态",
            options: [
              { value: "all", label: "全部状态" },
              { value: "firing", label: "告警中" },
              { value: "ack", label: "处理中" },
              { value: "resolved", label: "已恢复" },
            ],
          },
          {
            value: severity,
            onChange: setSeverity,
            placeholder: "级别",
            options: [
              { value: "all", label: "全部级别" },
              { value: "critical", label: "严重" },
              { value: "warning", label: "警告" },
              { value: "info", label: "提示" },
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
          <EmptyState title="当前没有告警" description="可以切换筛选条件查看历史告警。" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>级别</TableHead>
                <TableHead>告警</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => setCurrent(item)}>
                  <TableCell>
                    <StatusBadge value={item.severity} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.message}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.source}</TableCell>
                  <TableCell>
                    <StatusBadge value={item.status} />
                  </TableCell>
                  <TableCell>{formatRelative(item.firedAt)}</TableCell>
                  <TableCell className="space-x-1" onClick={(event) => event.stopPropagation()}>
                    <Button size="sm" variant="outline" onClick={() => setCurrent(item)}>
                      详情
                    </Button>
                    {item.status === "firing" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await api.updateAlert(item.id, "ack");
                          toast.success("已确认，进入处理中");
                          reload();
                        }}
                      >
                        确认
                      </Button>
                    ) : null}
                    {item.status !== "resolved" ? (
                      <Button size="sm" variant="ghost" onClick={() => setPendingResolve(item)}>
                        解决
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Sheet
        open={!!current}
        onOpenChange={(open) => {
          if (!open) {
            setCurrent(null);
            setNote("");
          }
        }}
      >
        <SheetContent>
          {current ? (
            <>
              <SheetHeader>
                <SheetTitle>{current.title}</SheetTitle>
                <SheetDescription>{current.message}</SheetDescription>
              </SheetHeader>
              <div className="space-y-3 overflow-y-auto px-5 py-4 text-sm">
                <p>
                  级别：<StatusBadge value={current.severity} /> 状态：<StatusBadge value={current.status} />
                </p>
                <p>触发时间：{formatDateTime(current.firedAt)}</p>
                {current.ackAt ? <p>确认时间：{formatDateTime(current.ackAt)}</p> : null}
                {current.resolvedAt ? <p>解决时间：{formatDateTime(current.resolvedAt)}</p> : null}
                <p className="font-mono text-xs">来源：{current.source}</p>
                <div className="flex flex-wrap gap-2">
                  {current.logId ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/developer/logs?requestId=${current.logId}`}>查看调用日志</Link>
                    </Button>
                  ) : null}
                  {current.traceId ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/ops/traces/${current.traceId}`}>查看 Trace</Link>
                    </Button>
                  ) : null}
                </div>
                {!current.logId && !current.traceId ? (
                  <p className="text-xs text-muted-foreground">该告警来自预设监控规则，没有关联单次调用。</p>
                ) : null}
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">处理备注</div>
                  {(current.notes ?? []).length ? (
                    <div className="space-y-2">
                      {current.notes?.map((item, index) => (
                        <div key={`${item.time}-${index}`} className="rounded-md border bg-slate-50 p-2">
                          <div className="text-[11px] text-muted-foreground">
                            {item.actor} · {formatDateTime(item.time)}
                          </div>
                          <div>{item.text}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">暂无备注</p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label>添加处理备注</Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="记录排查结论或处理动作" />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!note.trim()}
                    onClick={async () => {
                      await api.updateAlert(current.id, { note });
                      toast.success("备注已保存");
                      setNote("");
                      await refreshCurrent(current.id);
                    }}
                  >
                    保存备注
                  </Button>
                </div>
                <div className="flex gap-2">
                  {current.status === "firing" ? (
                    <Button
                      size="sm"
                      onClick={async () => {
                        await api.updateAlert(current.id, { status: "ack", note: note || undefined });
                        toast.success("已确认为处理中");
                        setNote("");
                        await refreshCurrent(current.id);
                      }}
                    >
                      标记处理中
                    </Button>
                  ) : null}
                  {current.status !== "resolved" ? (
                    <Button size="sm" variant="outline" onClick={() => setPendingResolve(current)}>
                      标记已解决
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!pendingResolve}
        title="标记告警为已解决"
        description={pendingResolve ? `确认将「${pendingResolve.title}」标记为已解决？该状态会持久化保存。` : ""}
        confirmText="确认解决"
        onOpenChange={(open) => {
          if (!open) setPendingResolve(null);
        }}
        onConfirm={async () => {
          if (!pendingResolve) return;
          await api.updateAlert(pendingResolve.id, { status: "resolved", note: note || undefined });
          toast.success("告警已标记为已解决");
          setNote("");
          setPendingResolve(null);
          if (current?.id === pendingResolve.id) await refreshCurrent(pendingResolve.id);
          else reload();
        }}
      />
    </div>
  );
}
