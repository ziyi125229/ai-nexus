"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/mock/api";

const schema = z.object({
  tenantName: z.string().min(2),
  timezone: z.string().min(2),
  alertEmail: z.string().email(),
  monthlyBudget: z.number().min(1000),
  retentionDays: z.number().min(7).max(180),
  enableGuardrails: z.boolean(),
  enableAuditLog: z.boolean(),
  allowExternalModels: z.boolean(),
});

export function SettingsPage() {
  const { data, loading, error, reload } = useAsync(() => api.getSettings(), []);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenantName: "北京电子数智科技有限责任公司",
      timezone: "Asia/Shanghai",
      alertEmail: "ai-platform@xinghe.tech",
      monthlyBudget: 280000,
      retentionDays: 30,
      enableGuardrails: true,
      enableAuditLog: true,
      allowExternalModels: true,
    },
  });

  useEffect(() => {
    if (data) form.reset(data);
  }, [data, form]);

  if (loading && !data) return <Skeleton className="h-64" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        title="系统设置"
        description="租户级配置。当前为面试演示 Demo 的本地设置，修改会持久化到浏览器 localStorage，不代表正式生产环境。"
        actions={
          <Button
            variant="outline"
            onClick={async () => {
              await api.resetDemo();
              toast.success("Demo 数据已重置");
              window.location.reload();
            }}
          >
            重置 Demo 数据
          </Button>
        }
      />
      <form
        className="grid gap-4 xl:grid-cols-2"
        onSubmit={form.handleSubmit(async (values) => {
          await api.saveSettings(values);
          toast.success("设置已保存");
          reload();
        })}
      >
        <Card>
          <CardHeader>
            <CardTitle>租户与通知</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>租户名称</Label>
              <Input {...form.register("tenantName")} />
            </div>
            <div className="grid gap-1.5">
              <Label>时区</Label>
              <Input {...form.register("timezone")} />
            </div>
            <div className="grid gap-1.5">
              <Label>告警邮箱</Label>
              <Input {...form.register("alertEmail")} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>治理与成本</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>月度预算（元）</Label>
              <Input type="number" {...form.register("monthlyBudget", { valueAsNumber: true })} />
            </div>
            <div className="grid gap-1.5">
              <Label>日志保留天数</Label>
              <Input type="number" {...form.register("retentionDays", { valueAsNumber: true })} />
            </div>
            <label className="flex items-center justify-between text-sm">
              启用输入/输出护栏
              <Switch
                checked={form.watch("enableGuardrails")}
                onCheckedChange={(v) => form.setValue("enableGuardrails", v)}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              启用操作审计
              <Switch checked={form.watch("enableAuditLog")} onCheckedChange={(v) => form.setValue("enableAuditLog", v)} />
            </label>
            <label className="flex items-center justify-between text-sm">
              允许接入外部模型
              <Switch
                checked={form.watch("allowExternalModels")}
                onCheckedChange={(v) => form.setValue("allowExternalModels", v)}
              />
            </label>
          </CardContent>
        </Card>
        <div className="xl:col-span-2">
          <Button type="submit">保存设置</Button>
        </div>
      </form>
    </div>
  );
}
