"use client";

import { useMemo, useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api, statusLabel } from "@/mock/api";
import { formatDateTime, formatRelative, maskSecret } from "@/lib/format";
import type { EnvType } from "@/types";

const schema = z.object({
  name: z.string().min(2),
  appId: z.string().min(1),
  env: z.enum(["prod", "staging", "dev"]),
});

const ALL_SCOPES = ["chat.completions", "embeddings", "rerank", "agents.invoke", "files.parse", "code.search"];

export function CredentialsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [scopes, setScopes] = useState<string[]>(["chat.completions"]);
  const [revealed, setRevealed] = useState<string | null>(null);
  const query = useMemo(
    () => ({ search, status: status === "all" ? undefined : status, pageSize: 20 }),
    [search, status],
  );
  const { data, loading, error, reload } = useAsync(() => api.listCredentials(query), [query]);
  const lookup = api.lookup();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", appId: lookup.apps[0]?.id ?? "", env: "staging" },
  });

  return (
    <div>
      <PageHeader
        title="API 凭证"
        description="密钥仅在创建时完整展示一次。生产密钥建议 90 天轮换，即将过期的凭证会出现在告警中心。"
        actions={<Button onClick={() => setOpen(true)}>创建凭证</Button>}
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="搜索凭证名称或前缀"
        filters={[
          {
            value: status,
            onChange: setStatus,
            placeholder: "状态",
            options: [
              { value: "all", label: "全部状态" },
              { value: "active", label: "启用" },
              { value: "expiring", label: "即将过期" },
              { value: "revoked", label: "已吊销" },
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
                <TableHead>名称</TableHead>
                <TableHead>应用</TableHead>
                <TableHead>密钥</TableHead>
                <TableHead>环境</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最近使用</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{lookup.apps.find((a) => a.id === item.appId)?.name ?? item.appId}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {revealed === item.id ? item.secret : maskSecret(item.prefix)}
                  </TableCell>
                  <TableCell>{statusLabel[item.env]}</TableCell>
                  <TableCell>
                    <StatusBadge value={item.status} />
                  </TableCell>
                  <TableCell>{item.lastUsedAt ? formatRelative(item.lastUsedAt) : "从未使用"}</TableCell>
                  <TableCell className="space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setRevealed(revealed === item.id ? null : item.id)}>
                      {revealed === item.id ? "隐藏" : "显示"}
                    </Button>
                    {item.status !== "revoked" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await api.updateCredential(item.id, "revoked");
                          toast.success("凭证已吊销");
                          reload();
                        }}
                      >
                        吊销
                      </Button>
                    ) : null}
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
            <DialogTitle>创建 API 凭证</DialogTitle>
            <DialogDescription>创建后请立即复制并妥善保存，平台不会再次下发完整密钥。</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={form.handleSubmit(async (values) => {
              const created = await api.createCredential({ ...values, env: values.env as EnvType, scopes });
              toast.success(`已创建 ${created.prefix}`);
              setOpen(false);
              reload();
            })}
          >
            <div className="grid gap-1.5">
              <Label>名称</Label>
              <Input {...form.register("name")} placeholder="知识问答 · 生产" />
            </div>
            <div className="grid gap-1.5">
              <Label>绑定应用</Label>
              <Select value={form.watch("appId")} onValueChange={(v) => form.setValue("appId", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lookup.apps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="grid gap-2">
              <Label>权限范围</Label>
              {ALL_SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={scopes.includes(scope)}
                    onCheckedChange={(checked) => {
                      setScopes((prev) => (checked ? [...prev, scope] : prev.filter((item) => item !== scope)));
                    }}
                  />
                  {scope}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button type="submit">创建</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <p className="mt-2 text-xs text-muted-foreground">过期时间示例会显示在审计与告警中。最近一次轮换：{formatDateTime(new Date().toISOString())}</p>
    </div>
  );
}
