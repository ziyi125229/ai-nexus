"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api, statusLabel } from "@/mock/api";
import { formatCompact, formatLatency, formatNumber, formatPercent } from "@/lib/format";
import type { ModelType } from "@/types";

const schema = z.object({
  displayName: z.string().min(2, "请填写模型名称"),
  name: z.string().min(2, "请填写模型标识"),
  provider: z.string().min(2, "请填写提供方"),
  version: z.string().min(1, "请填写版本"),
  type: z.enum(["llm", "embedding", "vision", "rerank", "speech", "multimodal"]),
  contextWindow: z.number().min(0),
  description: z.string().min(4, "请补充模型用途"),
});

type FormValues = z.infer<typeof schema>;

export function ModelsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const query = useMemo(
    () => ({ search, status: status === "all" ? undefined : status, type: type === "all" ? undefined : type, pageSize: 20 }),
    [search, status, type],
  );
  const { data, loading, error, reload } = useAsync(() => api.listModels(query), [query]);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: "",
      name: "",
      provider: "星河自研微调",
      version: "0.1.0",
      type: "llm",
      contextWindow: 32768,
      description: "",
    },
  });

  return (
    <div>
      <PageHeader
        title="模型管理"
        description="统一纳管外部大模型与内部微调模型。发布前需完成评测、安全和配额配置。"
        actions={<Button onClick={() => setOpen(true)}>注册模型</Button>}
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="搜索模型名称、提供方或标签"
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
              { value: "deprecated", label: "已废弃" },
            ],
          },
          {
            value: type,
            onChange: setType,
            placeholder: "类型",
            options: [
              { value: "all", label: "全部类型" },
              { value: "llm", label: "LLM" },
              { value: "embedding", label: "Embedding" },
              { value: "rerank", label: "Rerank" },
              { value: "vision", label: "Vision" },
              { value: "speech", label: "Speech" },
            ],
          },
        ]}
      />
      <Card>
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data?.items.length ? (
          <EmptyState title="没有匹配的模型" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模型</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>30 日调用</TableHead>
                <TableHead>成功率</TableHead>
                <TableHead>P50 延迟</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link href={`/assets/models/${item.id}`} className="font-medium hover:text-primary">
                      {item.displayName}
                    </Link>
                    <div className="font-mono text-[11px] text-muted-foreground">{item.name}</div>
                  </TableCell>
                  <TableCell>{statusLabel[item.type]}</TableCell>
                  <TableCell>
                    <StatusBadge value={item.status} />
                  </TableCell>
                  <TableCell>{formatCompact(item.callCount30d)}</TableCell>
                  <TableCell>{formatPercent(item.successRate, 2)}</TableCell>
                  <TableCell>{formatLatency(item.latencyP50)}</TableCell>
                  <TableCell>{item.owner.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {item.status === "reviewing" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await api.updateModel(item.id, { status: "published" });
                            toast.success(`${item.displayName} 已发布`);
                            reload();
                          }}
                        >
                          发布
                        </Button>
                      ) : null}
                      {item.status === "published" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            await api.updateModel(item.id, { status: "deprecated" });
                            toast.success("已标记废弃");
                            reload();
                          }}
                        >
                          废弃
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>注册模型</DialogTitle>
            <DialogDescription>新模型会以草稿状态进入资产中心，完成评测后可提交审核。</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={form.handleSubmit(async (values) => {
              await api.createModel({ ...values, type: values.type as ModelType, contextWindow: values.contextWindow });
              toast.success("模型已注册为草稿");
              setOpen(false);
              form.reset();
              reload();
            })}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="显示名称" error={form.formState.errors.displayName?.message}>
                <Input {...form.register("displayName")} placeholder="星河客服-V4" />
              </Field>
              <Field label="模型标识" error={form.formState.errors.name?.message}>
                <Input {...form.register("name")} placeholder="xinghe-customer-v4" />
              </Field>
              <Field label="提供方" error={form.formState.errors.provider?.message}>
                <Input {...form.register("provider")} />
              </Field>
              <Field label="版本" error={form.formState.errors.version?.message}>
                <Input {...form.register("version")} />
              </Field>
              <Field label="类型">
                <Select value={form.watch("type")} onValueChange={(v) => form.setValue("type", v as FormValues["type"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["llm", "embedding", "vision", "rerank", "speech"] as const).map((item) => (
                      <SelectItem key={item} value={item}>
                        {statusLabel[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="上下文窗口">
                <Input type="number" {...form.register("contextWindow", { valueAsNumber: true })} />
              </Field>
            </div>
            <Field label="描述" error={form.formState.errors.description?.message}>
              <Textarea {...form.register("description")} placeholder="说明适用场景、评测情况和依赖数据集" />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button type="submit">保存草稿</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <p className="mt-3 text-xs text-muted-foreground">共 {formatNumber(data?.total ?? 0)} 个模型</p>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
