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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { api, statusLabel } from "@/mock/api";
import { formatRelative } from "@/lib/format";
import type { UserRole } from "@/types";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email("请输入有效邮箱"),
  department: z.string().min(2),
  role: z.enum(["admin", "developer", "algorithm", "pm", "ops", "viewer"]),
});

export function UsersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [open, setOpen] = useState(false);
  const query = useMemo(
    () => ({ search, status: status === "all" ? undefined : status, type: role === "all" ? undefined : role, pageSize: 20 }),
    [search, status, role],
  );
  const { data, loading, error, reload } = useAsync(() => api.listUsers(query), [query]);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", department: "产品部", role: "developer" },
  });

  return (
    <div>
      <PageHeader
        title="用户与权限"
        description="RBAC 角色覆盖平台管理员、开发者、算法、产品、运维和只读财务。邀请用户会写入操作审计。"
        actions={<Button onClick={() => setOpen(true)}>邀请用户</Button>}
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="搜索姓名或邮箱"
        filters={[
          {
            value: status,
            onChange: setStatus,
            placeholder: "状态",
            options: [
              { value: "all", label: "全部状态" },
              { value: "active", label: "启用" },
              { value: "invited", label: "待加入" },
              { value: "disabled", label: "停用" },
            ],
          },
          {
            value: role,
            onChange: setRole,
            placeholder: "角色",
            options: [
              { value: "all", label: "全部角色" },
              { value: "admin", label: "平台管理员" },
              { value: "developer", label: "开发者" },
              { value: "algorithm", label: "算法工程师" },
              { value: "pm", label: "产品经理" },
              { value: "ops", label: "运维工程师" },
              { value: "viewer", label: "只读" },
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
                <TableHead>用户</TableHead>
                <TableHead>部门</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最近活跃</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.email}</div>
                  </TableCell>
                  <TableCell>{item.department}</TableCell>
                  <TableCell>{statusLabel[item.role]}</TableCell>
                  <TableCell>
                    <StatusBadge value={item.status} />
                  </TableCell>
                  <TableCell>{formatRelative(item.lastActiveAt)}</TableCell>
                  <TableCell>
                    {item.status === "active" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await api.updateUser(item.id, { status: "disabled" });
                          toast.success("已停用");
                          reload();
                        }}
                      >
                        停用
                      </Button>
                    ) : item.status !== "disabled" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await api.updateUser(item.id, { status: "active" });
                          toast.success("已启用");
                          reload();
                        }}
                      >
                        启用
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await api.updateUser(item.id, { status: "active" });
                          toast.success("已重新启用");
                          reload();
                        }}
                      >
                        启用
                      </Button>
                    )}
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
            <DialogTitle>邀请用户</DialogTitle>
            <DialogDescription>邀请后状态为待加入，对方完成登录后变为启用。</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={form.handleSubmit(async (values) => {
              await api.inviteUser({ ...values, role: values.role as UserRole });
              toast.success("邀请已发送");
              setOpen(false);
              form.reset();
              reload();
            })}
          >
            <div className="grid gap-1.5">
              <Label>姓名</Label>
              <Input {...form.register("name")} />
            </div>
            <div className="grid gap-1.5">
              <Label>邮箱</Label>
              <Input {...form.register("email")} />
              {form.formState.errors.email ? <p className="text-xs text-destructive">{form.formState.errors.email.message}</p> : null}
            </div>
            <div className="grid gap-1.5">
              <Label>部门</Label>
              <Input {...form.register("department")} />
            </div>
            <div className="grid gap-1.5">
              <Label>角色</Label>
              <Select value={form.watch("role")} onValueChange={(v) => form.setValue("role", v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["admin", "developer", "algorithm", "pm", "ops", "viewer"] as const).map((item) => (
                    <SelectItem key={item} value={item}>
                      {statusLabel[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button type="submit">发送邀请</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
