import { createId } from "@/lib/utils";
import type {
  AlertRecord,
  CallLogRecord,
  CallStatus,
  PlaygroundResult,
  StoreState,
  TraceRecord,
  TraceSpan,
} from "@/types";

export interface InvokeInput {
  appId: string;
  prompt: string;
  modelId?: string;
  agentId?: string;
  temperature?: number;
  maxTokens?: number;
  simulateFailure?: boolean;
}

export interface InvokeBundle {
  result: PlaygroundResult;
  log: CallLogRecord;
  trace: TraceRecord;
  alert?: AlertRecord;
}

function nowIso(): string {
  return new Date().toISOString();
}

function failMode(input: InvokeInput): CallStatus | null {
  if (input.simulateFailure) {
    return input.prompt.includes("超时") ? "timeout" : "error";
  }
  if (input.prompt.includes("超时")) return "timeout";
  if (input.prompt.includes("无权限") || input.prompt.includes("失败")) return "error";
  return null;
}

function mockAnswer(prompt: string, agentName: string | undefined, toolNames: string[]): string {
  const summary = prompt.trim().slice(0, 72) || "（空问题）";
  const toolLine = toolNames.length
    ? `已按工作流调用工具：${toolNames.join("、")}，再由主模型汇总。`
    : "未配置工具，由主模型直接生成回复。";
  return [
    `[Mock AI Provider] ${agentName ? `Agent「${agentName}」` : "模型直出"}已完成本地模拟推理。`,
    "",
    `问题摘要：${summary}`,
    toolLine,
    "结论：当前为演示环境的本地模拟输出，未请求真实模型 API。",
  ].join("\n");
}

export function simulateInvocation(store: StoreState, input: InvokeInput): InvokeBundle {
  const app = store.apps.find((item) => item.id === input.appId);
  if (!app) throw new Error("应用不存在");
  if (app.status === "offline" || app.status === "maintenance") {
    throw new Error(`应用「${app.name}」当前为${app.status === "offline" ? "已下线" : "维护中"}，无法调用`);
  }

  const agent = input.agentId ? store.agents.find((item) => item.id === input.agentId) : undefined;
  if (input.agentId && !agent) throw new Error("Agent 不存在");
  if (agent && agent.status !== "published") throw new Error(`Agent「${agent.name}」未发布，无法调用`);

  const modelId = agent?.modelId ?? input.modelId;
  if (!modelId) throw new Error("请选择模型或已发布的 Agent");
  const model = store.models.find((item) => item.id === modelId);
  if (!model) throw new Error("模型不存在");
  if (model.status !== "published") throw new Error(`模型「${model.displayName}」未发布或已下线`);

  if (agent && app.agentIds.length && !app.agentIds.includes(agent.id) && !app.modelIds.includes(model.id)) {
    throw new Error("该 Agent 未绑定到当前应用");
  }

  const tools = (agent?.toolIds ?? [])
    .map((id) => store.tools.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const fail = failMode(input);
  const started = new Date();
  const requestId = `req_${started.getTime().toString(36)}_${createId("r").slice(-4)}`;
  const traceId = `trace_${requestId.slice(4)}`;
  const logId = createId("log");
  const spans: TraceSpan[] = [];
  let cursor = 0;

  const push = (span: Omit<TraceSpan, "id" | "startMs" | "startedAt">) => {
    const item: TraceSpan = {
      id: createId("span"),
      startMs: cursor,
      startedAt: new Date(started.getTime() + cursor).toISOString(),
      ...span,
    };
    spans.push(item);
    cursor += span.durationMs;
    return item;
  };

  push({
    name: "用户输入",
    type: "gateway",
    durationMs: 18,
    status: "success",
    detail: `应用 ${app.name} · Mock 网关鉴权通过`,
    inputSummary: input.prompt.slice(0, 160),
    outputSummary: "鉴权通过，进入编排",
  });

  if (agent) {
    push({
      name: "Agent 任务开始",
      type: "agent",
      durationMs: 120,
      status: "success",
      detail: `${agent.name} v${agent.version} 开始规划`,
      inputSummary: input.prompt.slice(0, 120),
      outputSummary: tools.length ? `计划调用 ${tools.length} 个工具` : "无工具，直接调用模型",
    });
  }

  let failed: CallStatus | null = null;
  const failAtTool = Boolean(fail && tools.length);

  tools.forEach((tool, index) => {
    if (failed) return;
    const isFailNode = failAtTool && index === tools.length - 1;
    const status: CallStatus = isFailNode ? fail ?? "error" : "success";
    const duration = isFailNode && fail === "timeout" ? 1800 : 90 + index * 40;
    const errorMessage = isFailNode
      ? fail === "timeout"
        ? `工具 ${tool.displayName} 等待超时`
        : `工具 ${tool.displayName} 返回无权限或上游错误`
      : undefined;
    push({
      name: `工具调用 · ${tool.displayName}`,
      type: tool.type === "retrieval" ? "retrieval" : "tool",
      durationMs: duration,
      status,
      detail: tool.name,
      inputSummary: `调用 ${tool.name}，参数来自 Agent 规划`,
      outputSummary: isFailNode ? undefined : "已发出工具请求",
      errorMessage,
    });
    if (isFailNode) {
      failed = status;
      return;
    }
    push({
      name: `工具结果返回 · ${tool.displayName}`,
      type: tool.type === "retrieval" ? "retrieval" : "tool",
      durationMs: 36,
      status: "success",
      detail: tool.name,
      inputSummary: `${tool.name} 响应`,
      outputSummary: "返回 Mock 工具结果，写入上下文",
    });
  });

  if (!failed) {
    const isFailNode = Boolean(fail && !failAtTool);
    const status: CallStatus = isFailNode ? fail ?? "error" : "success";
    const duration = isFailNode && fail === "timeout" ? 2400 : 420 + Math.round((input.maxTokens ?? 512) / 4);
    push({
      name: `模型调用 · ${model.displayName}`,
      type: "model",
      durationMs: duration,
      status,
      detail: `${model.name} · temperature=${input.temperature ?? 0.3}`,
      inputSummary: input.prompt.slice(0, 120),
      outputSummary: isFailNode ? undefined : "生成模拟回复",
      errorMessage: isFailNode
        ? fail === "timeout"
          ? "模型上游无响应，网关切断"
          : "模型推理失败（Mock）"
        : undefined,
    });
    if (isFailNode) failed = status;
  }

  const status: CallStatus = failed ?? "success";
  const output =
    status === "success"
      ? mockAnswer(
          input.prompt,
          agent?.name,
          tools.map((item) => item.displayName),
        )
      : "";
  if (status === "success") {
    push({
      name: "最终结果输出",
      type: "output",
      durationMs: 40,
      status: "success",
      detail: "输出护栏通过",
      inputSummary: "汇总模型与工具结果",
      outputSummary: output.slice(0, 80),
    });
  }

  const latency = cursor;
  const inputTokens = Math.max(16, Math.ceil(input.prompt.length / 2));
  const outputTokens = status === "success" ? Math.max(24, Math.ceil(output.length / 2)) : 0;
  const errorCode = status === "timeout" ? "GATEWAY_TIMEOUT" : status === "error" ? "MOCK_INVOKE_FAILED" : undefined;
  const errorMessage = spans.find((item) => item.status !== "success")?.errorMessage;
  const createdAt = nowIso();

  const log: CallLogRecord = {
    id: logId,
    time: createdAt,
    appId: app.id,
    modelId: model.id,
    agentId: agent?.id,
    status,
    latency,
    inputTokens,
    outputTokens,
    cost: Number(((inputTokens * 0.004 + outputTokens * 0.012) / 1000).toFixed(4)),
    requestId,
    traceId,
    prompt: input.prompt,
    output: output || undefined,
    errorCode,
    errorMessage,
  };

  const trace: TraceRecord = {
    id: traceId,
    requestId,
    logId,
    appId: app.id,
    agentId: agent?.id,
    modelId: model.id,
    status,
    startAt: createdAt,
    durationMs: latency,
    prompt: input.prompt,
    output: output || undefined,
    spans,
  };

  const result: PlaygroundResult = {
    id: createId("play"),
    modelId: model.id,
    prompt: input.prompt,
    output: output || errorMessage || "调用失败",
    latency,
    inputTokens,
    outputTokens,
    finishReason: status === "success" ? "stop" : status,
    createdAt,
    appId: app.id,
    agentId: agent?.id,
    requestId,
    traceId,
    logId,
    status,
    errorMessage,
  };

  const alert: AlertRecord | undefined =
    status === "success"
      ? undefined
      : {
          id: createId("alert"),
          severity: status === "timeout" ? "critical" : "warning",
          status: "firing",
          title: status === "timeout" ? `${model.displayName} 调用超时` : `${app.name} 模拟调用失败`,
          message: errorMessage ?? "Mock AI Provider 返回失败，请查看 Trace。",
          source: "playground.mock",
          resourceType: agent ? "agent" : "model",
          resourceId: agent?.id ?? model.id,
          firedAt: createdAt,
          logId,
          traceId,
          notes: [],
        };

  return { result, log, trace, alert };
}
