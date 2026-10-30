"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/mock/api";
import { TEAMS } from "@/lib/departments";
import { formatCompact, formatPercent } from "@/lib/format";
import type { AgentRecord } from "@/types";

const schema = z.object({
  name: z.string().min(2, "请填写 Agent 名称"),
  description: z.string().min(4, "请填写用途说明"),
  team: z.string().min(1, "请选择所属团队"),
  modelId: z.string().min(1, "请选择主模型"),
  version: z.string().min(1, "请填写版本号"),
});

type FormValues = z.infer<typeof schema>;

export function AgentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "summary">("form");
  const [toolIds, setToolIds] = useState<string[]>([]);
  const [datasetIds, setDatasetIds] = useState<string[]>([]);
  const [pendingPublish, setPendingPublish] = useState<AgentRecord | null>(null);
  const query = useMemo(
    () => ({ search, status: status === "all" ? undefined : status, pageSize: 20 }),
    [search, status],
  );
  const { data, loading, error, reload } = useAsync(() => api.listAgents(query), [query]);
  const lookup = api.lookup();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", team: "平台工程部", modelId: "", version: "0.1.0" },
  });
  const values = form.watch();
  const selectedModel = lookup.models.find((item) => item.id === values.modelId);
  const selectedTools = lookup.tools.filter((item) => toolIds.includes(item.id));
  const selectedDatasets = lookup.datasets.filter((item) => datasetIds.includes(item.id));
  const canPublish = Boolean(values.modelId && toolIds.length);

  const resetForm = () => {
    form.reset();
    setToolIds([]);
    setDatasetIds([]);
    setStep("form");
  };

  const submit = async (publish: boolean) => {
    const valid = await form.trigger();
    if (!valid) {
      setStep("form");
      const firstError = Object.values(form.formState.errors)[0]?.message;
      toast.error(typeof firstError === "string" ? firstError : "请完善必填项后再保存");
      return;
    }
    if (publish && !canPublish) {
      toast.error("发布前必须选择已发布的模型和至少一个工具");
      setStep("form");
      return;
    }
    try {
      const record = await api.createAgent({
        ...form.getValues(),
        toolIds,
        datasetIds,
        publish,
      });
      toast.success(publish ? `${record.name} 已发布` : "Agent 草稿已保存");
      setOpen(false);
      resetForm();
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  };

  return (
    <div>
      <PageHeader
        title="Agent 管理"
        description="编排模型、工具和知识资产。草稿可保存；发布前需绑定已发布模型与工具，并确认配置摘要。"
        actions={<Button onClick={() => setOpen(true)}>新建 Agent</Button>}
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="搜索 Agent"
        filters={[
          {
            value: status,
            onChange: setStatus,
            placeholder: "状态",
            options: [
              { value: "all", label: "全部状态" },
              { value: "published", label: "已发布" },
              { value: "draft", label: "草稿" },
              { value: "reviewing", label: "审核中" },
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
                <TableHead>Agent</TableHead>
                <TableHead>主模型</TableHead>
                <TableHead>工具数</TableHead>
                <TableHead>团队</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>30 日调用</TableHead>
                <TableHead>成功率</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link href={`/assets/agents/${item.id}`} className="font-medium hover:text-primary">
                      {item.name}
                    </Link>
                    <div className="text-[11px] text-muted-foreground">v{item.version}</div>
                  </TableCell>
                  <TableCell>{lookup.models.find((m) => m.id === item.modelId)?.displayName ?? item.modelId}</TableCell>
                  <TableCell>{item.toolIds.length}</TableCell>
                  <TableCell>{item.owner.department}</TableCell>
                  <TableCell>
                    <StatusBadge value={item.status} />
                  </TableCell>
                  <TableCell>{formatCompact(item.callCount30d)}</TableCell>
                  <TableCell>{item.successRate ? formatPercent(item.successRate, 1) : "-"}</TableCell>
                  <TableCell>
                    {item.status === "draft" ? (
                      <Button size="sm" variant="outline" onClick={() => setPendingPublish(item)}>
                        发布
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/assets/agents/${item.id}`}>工作流</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{step === "form" ? "新建 Agent" : "发布前确认"}</DialogTitle>
            <DialogDescription>
              {step === "form"
                ? "模型、工具和数据集均来自资产中心。保存草稿不要求工具；发布必须绑定已发布模型与工具。"
                : "请核对配置摘要。确认后会写入 Agent 列表，并同步总览中的已发布数量。"}
            </DialogDescription>
          </DialogHeader>
          {step === "form" ? (
            <form
              className="grid gap-3"
              onSubmit={form.handleSubmit(
                () => setStep("summary"),
                (errors) => {
                  const firstError = Object.values(errors)[0]?.message;
                  toast.error(typeof firstError === "string" ? firstError : "请完善必填项后再保存");
                },
              )}
            >
              <Field label="Agent 名称" error={form.formState.errors.name?.message}>
                <Input {...form.register("name")} placeholder="例如：售后升级助手" />
              </Field>
              <Field label="用途说明" error={form.formState.errors.description?.message}>
                <Textarea
                  className="min-h-20"
                  {...form.register("description")}
                  placeholder="说明目标场景、工具策略和护栏要求"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="版本号" error={form.formState.errors.version?.message}>
                  <Input {...form.register("version")} placeholder="0.1.0" />
                </Field>
                <Field label="所属团队" error={form.formState.errors.team?.message}>
                  <Select value={values.team} onValueChange={(v) => form.setValue("team", v, { shouldValidate: true })}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择团队" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAMS.map((team) => (
                        <SelectItem key={team} value={team}>
                          {team}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="主模型" error={form.formState.errors.modelId?.message}>
                <Select
                  value={values.modelId || undefined}
                  onValueChange={(v) => form.setValue("modelId", v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择已发布模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookup.models
                      .filter((model) => model.status === "published")
                      .map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.displayName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid gap-1.5">
                <Label>工具（发布必选，可多选）</Label>
                <div className="grid max-h-32 gap-2 overflow-y-auto rounded-md border p-2">
                  {lookup.tools
                    .filter((tool) => tool.status === "published")
                    .map((tool) => (
                      <label key={tool.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={toolIds.includes(tool.id)}
                          onCheckedChange={(checked) => {
                            setToolIds((prev) => (checked ? [...prev, tool.id] : prev.filter((id) => id !== tool.id)));
                          }}
                        />
                        {tool.displayName}
                        <span className="text-[11px] text-muted-foreground">{tool.name}</span>
                      </label>
                    ))}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>数据集（可选）</Label>
                <div className="grid max-h-28 gap-2 overflow-y-auto rounded-md border p-2">
                  {lookup.datasets
                    .filter((dataset) => dataset.status === "published")
                    .map((dataset) => (
                      <label key={dataset.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={datasetIds.includes(dataset.id)}
                          onCheckedChange={(checked) => {
                            setDatasetIds((prev) =>
                              checked ? [...prev, dataset.id] : prev.filter((id) => id !== dataset.id),
                            );
                          }}
                        />
                        {dataset.name}
                      </label>
                    ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button type="button" variant="outline" onClick={() => void submit(false)}>
                  保存草稿
                </Button>
                <Button type="submit">下一步：核对摘要</Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-3 text-sm">
              <SummaryRow label="名称" value={`${values.name} · v${values.version}`} />
              <SummaryRow label="用途说明" value={values.description} />
              <SummaryRow label="团队" value={values.team} />
              <SummaryRow label="模型" value={selectedModel?.displayName ?? "未选择"} />
              <SummaryRow label="工具" value={selectedTools.map((item) => item.displayName).join("、") || "未选择"} />
              <SummaryRow label="数据集" value={selectedDatasets.map((item) => item.name).join("、") || "无"} />
              {!canPublish ? (
                <p className="text-xs text-destructive">缺少已发布模型或工具，只能保存草稿，不能发布。</p>
              ) : null}
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button type="button" variant="outline" onClick={() => setStep("form")}>
                  返回修改
                </Button>
                <Button type="button" variant="outline" onClick={() => void submit(false)}>
                  保存草稿
                </Button>
                <Button type="button" disabled={!canPublish} onClick={() => void submit(true)}>
                  确认发布
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingPublish}
        title="发布 Agent"
        description={
          pendingPublish
            ? `将发布「${pendingPublish.name}」。发布前会校验模型与工具是否已发布；成功后总览中的已发布 Agent 数量会同步增加。`
            : ""
        }
        confirmText="确认发布"
        onOpenChange={(next) => {
          if (!next) setPendingPublish(null);
        }}
        onConfirm={async () => {
          if (!pendingPublish) return;
          try {
            await api.publishAgent(pendingPublish.id);
            toast.success("Agent 已发布");
            setPendingPublish(null);
            reload();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "发布失败");
          }
        }}
      />
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
