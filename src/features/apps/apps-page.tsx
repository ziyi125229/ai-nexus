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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api, statusLabel } from "@/mock/api";
import { TEAMS } from "@/lib/departments";
import { formatCompact, formatCurrency, formatPercent } from "@/lib/format";
import type { EnvType } from "@/types";

const schema = z.object({
  name: z.string().min(2, "请填写应用名称"),
  slug: z
    .string()
    .optional()
    .refine((value) => !value || /^[a-z0-9-]+$/.test(value), "仅允许小写字母、数字和短横线"),
  description: z.string().min(4, "请填写应用描述"),
  env: z.enum(["prod", "staging", "dev"]),
  team: z.string().min(1, "请选择所属团队"),
});

export function AppsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [env, setEnv] = useState("all");
  const [open, setOpen] = useState(false);
  const [modelIds, setModelIds] = useState<string[]>([]);
  const [agentIds, setAgentIds] = useState<string[]>([]);
  const query = useMemo(
    () => ({ search, status: status === "all" ? undefined : status, type: env === "all" ? undefined : env, pageSize: 20 }),
    [search, status, env],
  );
  const { data, loading, error, reload } = useAsync(() => api.listApps(query), [query]);
  const lookup = api.lookup();
  const publishedModels = lookup.models.filter((item) => item.status === "published");
  const publishedAgents = lookup.agents.filter((item) => item.status === "published");
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", description: "", env: "staging", team: "平台工程部" },
  });

  const resetForm = () => {
    form.reset();
    setModelIds([]);
    setAgentIds([]);
  };

  return (
    <div>
      <PageHeader
        title="应用管理"
        description="每个应用拥有独立的环境、配额、预算和 API 凭证。创建时必须绑定已发布的模型或 Agent，之后可在 Playground 中模拟调用。"
        actions={<Button onClick={() => setOpen(true)}>创建应用</Button>}
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="搜索应用名称或 slug"
        filters={[
          {
            value: status,
            onChange: setStatus,
            placeholder: "运行状态",
            options: [
              { value: "all", label: "全部状态" },
              { value: "online", label: "运行中" },
              { value: "degraded", label: "降级" },
              { value: "maintenance", label: "维护中" },
              { value: "offline", label: "已下线" },
            ],
          },
          {
            value: env,
            onChange: setEnv,
            placeholder: "环境",
            options: [
              { value: "all", label: "全部环境" },
              { value: "prod", label: "生产" },
              { value: "staging", label: "预发" },
              { value: "dev", label: "开发" },
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
                <TableHead>应用</TableHead>
                <TableHead>团队</TableHead>
                <TableHead>环境</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>30 日调用</TableHead>
                <TableHead>成功率</TableHead>
                <TableHead>今日预算</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link href={`/developer/apps/${item.id}`} className="font-medium hover:text-primary">
                      {item.name}
                    </Link>
                    <div className="font-mono text-[11px] text-muted-foreground">{item.slug}</div>
                  </TableCell>
                  <TableCell>{item.owner.department}</TableCell>
                  <TableCell>{statusLabel[item.env]}</TableCell>
                  <TableCell>
                    <StatusBadge value={item.status} />
                  </TableCell>
                  <TableCell>{formatCompact(item.callCount30d)}</TableCell>
                  <TableCell>{formatPercent(item.successRate, 1)}</TableCell>
                  <TableCell>
                    {formatCurrency(item.spentToday, 0)} / {formatCurrency(item.dailyBudget, 0)}
                  </TableCell>
                  <TableCell className="space-x-1">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/developer/playground?appId=${item.id}`}>Playground</Link>
                    </Button>
                    {item.status === "degraded" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await api.updateApp(item.id, { status: "online" });
                          toast.success("已恢复运行");
                          reload();
                        }}
                      >
                        恢复
                      </Button>
                    ) : item.status === "online" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await api.updateApp(item.id, { status: "maintenance" });
                          toast.success("已进入维护");
                          reload();
                        }}
                      >
                        维护
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/developer/apps/${item.id}`}>详情</Link>
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
            <DialogTitle>创建应用</DialogTitle>
            <DialogDescription>
              必须选择已发布的模型或 Agent。创建成功后会出现在应用列表，并可在 Playground 中被选择。
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={form.handleSubmit(async (values) => {
              if (!modelIds.length && !agentIds.length) {
                toast.error("请至少选择一个已发布的模型或 Agent");
                return;
              }
              try {
                const record = await api.createApp({
                  ...values,
                  slug: values.slug || undefined,
                  env: values.env as EnvType,
                  modelIds,
                  agentIds,
                });
                toast.success(`${record.name} 已创建，可前往 Playground 模拟调用`);
                setOpen(false);
                resetForm();
                reload();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "创建失败");
              }
            })}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>应用名称</Label>
                <Input {...form.register("name")} placeholder="例如：售后助手应用" />
                {form.formState.errors.name ? (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                ) : null}
              </div>
              <div className="grid gap-1.5">
                <Label>所属团队</Label>
                <Select value={form.watch("team")} onValueChange={(v) => form.setValue("team", v, { shouldValidate: true })}>
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
                {form.formState.errors.team ? (
                  <p className="text-xs text-destructive">{form.formState.errors.team.message}</p>
                ) : null}
              </div>
              <div className="grid gap-1.5">
                <Label>Slug（可选）</Label>
                <Input {...form.register("slug")} placeholder="cs-assistant" />
                {form.formState.errors.slug ? (
                  <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
                ) : null}
              </div>
              <div className="grid gap-1.5">
                <Label>环境</Label>
                <Select value={form.watch("env")} onValueChange={(v) => form.setValue("env", v as EnvType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dev">开发</SelectItem>
                    <SelectItem value="staging">预发</SelectItem>
                    <SelectItem value="prod">生产</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>描述</Label>
              <Textarea {...form.register("description")} placeholder="说明调用场景、配额预期和绑定资产" />
              {form.formState.errors.description ? (
                <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label>已发布模型</Label>
              <div className="grid max-h-32 gap-2 overflow-y-auto rounded-md border p-2">
                {publishedModels.map((model) => (
                  <label key={model.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={modelIds.includes(model.id)}
                      onCheckedChange={(checked) => {
                        setModelIds((prev) => (checked ? [...prev, model.id] : prev.filter((id) => id !== model.id)));
                      }}
                    />
                    {model.displayName}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>已发布 Agent</Label>
              <div className="grid max-h-32 gap-2 overflow-y-auto rounded-md border p-2">
                {publishedAgents.map((agent) => (
                  <label key={agent.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={agentIds.includes(agent.id)}
                      onCheckedChange={(checked) => {
                        setAgentIds((prev) => (checked ? [...prev, agent.id] : prev.filter((id) => id !== agent.id)));
                      }}
                    />
                    {agent.name}
                    <span className="text-[11px] text-muted-foreground">v{agent.version}</span>
                  </label>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">至少选择一个已发布模型或 Agent。未发布资产不会出现在列表中。</p>
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button type="submit">保存应用</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
