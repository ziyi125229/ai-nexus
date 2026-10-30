"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/mock/api";
import { formatLatency } from "@/lib/format";
import type { PlaygroundResult } from "@/types";

export function PlaygroundPage({ initialAppId, initialAgentId }: { initialAppId?: string; initialAgentId?: string }) {
  const lookup = api.lookup();
  const apps = lookup.apps;
  const publishedModels = lookup.models.filter((item) => item.status === "published" && item.type === "llm");
  const publishedAgents = lookup.agents.filter((item) => item.status === "published");
  const [appId, setAppId] = useState(initialAppId && apps.some((item) => item.id === initialAppId) ? initialAppId : (apps[0]?.id ?? ""));
  const selectedApp = apps.find((item) => item.id === appId);
  const boundAgents = publishedAgents.filter((item) => selectedApp?.agentIds.includes(item.id));
  const boundModels = publishedModels.filter((item) => selectedApp?.modelIds.includes(item.id));
  const agentOptions = boundAgents.length ? boundAgents : publishedAgents;
  const modelOptions = boundModels.length ? boundModels : publishedModels;
  const defaultTarget =
    initialAgentId && agentOptions.some((item) => item.id === initialAgentId)
      ? "agent"
      : boundAgents.length
        ? "agent"
        : "model";
  const [targetType, setTargetType] = useState<"model" | "agent">(defaultTarget);
  const [modelId, setModelId] = useState(modelOptions[0]?.id ?? "");
  const [agentId, setAgentId] = useState(
    initialAgentId && agentOptions.some((item) => item.id === initialAgentId) ? initialAgentId : (agentOptions[0]?.id ?? ""),
  );
  const [prompt, setPrompt] = useState("帮我总结这个工单的处理建议，并说明需要调用哪些工具。");
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(512);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const history = useAsync(() => api.getPlaygroundHistory(), []);
  const appOffline = selectedApp?.status === "offline" || selectedApp?.status === "maintenance";
  const promptHint = "输入「超时」「失败」或「无权限」可触发失败路径；也可打开「模拟失败」。";

  const onAppChange = (next: string) => {
    setAppId(next);
    const app = apps.find((item) => item.id === next);
    const nextAgents = publishedAgents.filter((item) => app?.agentIds.includes(item.id));
    const nextModels = publishedModels.filter((item) => app?.modelIds.includes(item.id));
    if (nextAgents.length) {
      setTargetType("agent");
      setAgentId(nextAgents[0].id);
    } else {
      setTargetType("model");
    }
    if (nextModels.length) setModelId(nextModels[0].id);
  };

  return (
    <div>
      <PageHeader
        title="API 调试"
        badge={<Badge variant="warning">Mock 模式</Badge>}
        description="调用走本地 Mock AI Provider，不会请求真实模型 API。每次运行都会写入调用日志和 Trace，失败时还会生成告警。"
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>模拟请求</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!appId) {
                  toast.error("请选择应用");
                  return;
                }
                if (prompt.trim().length < 4) {
                  toast.error("请输入问题");
                  return;
                }
                if (targetType === "agent" && !agentId) {
                  toast.error("请选择已发布的 Agent");
                  return;
                }
                if (targetType === "model" && !modelId) {
                  toast.error("请选择已发布的模型");
                  return;
                }
                setRunning(true);
                try {
                  const next = await api.runPlayground({
                    appId,
                    prompt,
                    temperature,
                    maxTokens,
                    simulateFailure,
                    modelId: targetType === "model" ? modelId : undefined,
                    agentId: targetType === "agent" ? agentId : undefined,
                  });
                  setResult(next);
                  if (next.status === "success") {
                    toast.success(`模拟调用完成 · ${formatLatency(next.latency)}`);
                  } else {
                    toast.error(next.errorMessage ?? "模拟调用失败");
                  }
                  history.reload();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "调用失败");
                } finally {
                  setRunning(false);
                }
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>应用</Label>
                  <Select value={appId} onValueChange={onAppChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择应用" />
                    </SelectTrigger>
                    <SelectContent>
                      {apps.map((app) => (
                        <SelectItem key={app.id} value={app.id}>
                          {app.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {appOffline ? (
                    <p className="text-xs text-destructive">应用当前为已下线或维护中，无法调用。</p>
                  ) : null}
                </div>
                <div className="grid gap-1.5">
                  <Label>调用目标</Label>
                  <Select value={targetType} onValueChange={(v) => setTargetType(v as "model" | "agent")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="model">模型</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {targetType === "agent" ? (
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label>Agent</Label>
                    <Select value={agentId} onValueChange={setAgentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择已发布 Agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agentOptions.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name} · v{agent.version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!agentOptions.length ? <p className="text-xs text-destructive">当前没有可调用的已发布 Agent。</p> : null}
                  </div>
                ) : (
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label>模型</Label>
                    <Select value={modelId} onValueChange={setModelId}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择已发布模型" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelOptions.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label>temperature</Label>
                  <Input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
                </div>
                <div className="grid gap-1.5">
                  <Label>max_tokens</Label>
                  <Input type="number" value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>问题</Label>
                <Textarea className="min-h-36 font-mono text-xs" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                <p className="text-xs text-muted-foreground">{promptHint}</p>
              </div>
              <div className="flex items-center justify-between rounded-md border bg-amber-50 px-3 py-2">
                <div>
                  <div className="text-sm font-medium">模拟失败</div>
                  <div className="text-[11px] text-muted-foreground">打开后按 Agent 工作流走到失败节点，并写入告警。</div>
                </div>
                <Switch checked={simulateFailure} onCheckedChange={setSimulateFailure} />
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={running || appOffline}>
                  {running ? "模拟调用中..." : "运行"}
                </Button>
                <span className="text-xs text-muted-foreground">本地 Mock Provider，无真实模型计费。</span>
              </div>
            </form>
            {result ? (
              <div className="mt-4 rounded-md border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusBadge value={result.status ?? "success"} />
                  <Badge variant="warning">Mock</Badge>
                  <span className="text-xs text-muted-foreground">{formatLatency(result.latency)}</span>
                </div>
                <dl className="mb-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Request ID</dt>
                    <dd className="font-mono">{result.requestId}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Trace ID</dt>
                    <dd className="font-mono">{result.traceId}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Token</dt>
                    <dd>
                      输入 {result.inputTokens} / 输出 {result.outputTokens}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">状态</dt>
                    <dd>{result.status === "success" ? "执行成功" : result.errorMessage ?? "失败"}</dd>
                  </div>
                </dl>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 font-sans text-xs">
                  {result.output}
                </pre>
                <div className="mt-3 flex gap-2">
                  {result.traceId ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/ops/traces/${result.traceId}`}>查看 Trace</Link>
                    </Button>
                  ) : null}
                  {result.requestId ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/developer/logs?requestId=${result.requestId}`}>查看调用日志</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>最近调试记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!history.data?.length ? (
              <p className="text-sm text-muted-foreground">运行一次模拟调用后，结果会显示在这里，并同步到调用日志与 Trace。</p>
            ) : (
              history.data.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <StatusBadge value={item.status ?? "success"} />
                    <span>{formatLatency(item.latency)}</span>
                  </div>
                  <div className="mb-1 font-mono text-[11px] text-muted-foreground">{item.requestId}</div>
                  <pre className="max-h-28 overflow-auto whitespace-pre-wrap font-sans text-xs">{item.output}</pre>
                  {item.traceId ? (
                    <Link href={`/ops/traces/${item.traceId}`} className="mt-2 inline-block text-xs text-primary hover:underline">
                      打开 Trace
                    </Link>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
