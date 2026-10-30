import { createId, wait } from "@/lib/utils";
import { formatCompact, formatNumber, formatPercent } from "@/lib/format";
import { getStore, resetStore, updateStore } from "@/mock/store";
import { simulateInvocation, type InvokeInput } from "@/mock/provider";
import type {
  AgentRecord,
  AlertRecord,
  AppRecord,
  CallLogRecord,
  CredentialRecord,
  CredentialStatus,
  DailyMetric,
  DatasetRecord,
  DependencyEdge,
  DependencyNode,
  KpiMetric,
  ListQuery,
  ModelRecord,
  OverviewData,
  Paginated,
  PlaygroundResult,
  PlatformSettings,
  SparkPoint,
  TimeRange,
  ToolRecord,
  TraceRecord,
  UserRecord,
  UserRole,
} from "@/types";

function paginate<T>(items: T[], query: ListQuery): Paginated<T> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 12;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length };
}

function matchText(value: string, search?: string): boolean {
  if (!search) return true;
  return value.toLowerCase().includes(search.trim().toLowerCase());
}

function sparkFrom(values: number[], dates: string[]): SparkPoint[] {
  return values.map((v, i) => ({ t: dates[i] ?? String(i), v }));
}

function sliceTrend(trend: DailyMetric[], range: TimeRange): DailyMetric[] {
  if (range === "24h") return trend.slice(-2);
  if (range === "7d") return trend.slice(-7);
  return trend.slice(-30);
}

function nowIso(): string {
  return new Date().toISOString();
}

function publishBlockReason(store: ReturnType<typeof getStore>, agent: { modelId: string; toolIds: string[] }): string | null {
  const model = store.models.find((item) => item.id === agent.modelId);
  if (!model) return "未绑定模型，无法发布";
  if (model.status !== "published") return `模型「${model.displayName}」未发布或已下线，无法发布 Agent`;
  if (!agent.toolIds.length) return "至少选择一个工具后才能发布";
  for (const id of agent.toolIds) {
    const tool = store.tools.find((item) => item.id === id);
    if (!tool) return "存在已删除的工具，无法发布";
    if (tool.status !== "published") return `工具「${tool.displayName}」未发布，无法发布 Agent`;
  }
  return null;
}

function writeAudit(action: string, resourceType: string, resourceId: string, detail: string) {
  updateStore((draft) => {
    draft.audits.unshift({
      id: createId("aud"),
      time: nowIso(),
      actorId: "user-zhang",
      action,
      resourceType,
      resourceId,
      result: "success",
      ip: "10.12.1.2",
      detail,
    });
  });
}

export const api = {
  async getOverview(range: TimeRange = "7d"): Promise<OverviewData> {
    await wait();
    const store = getStore();
    const trend = sliceTrend(store.dailyMetrics, range);
    const prev = sliceTrend(store.dailyMetrics, range === "30d" ? "30d" : "7d");
    const currentCalls = trend.reduce((s, d) => s + d.calls, 0);
    const prevCalls = prev.length > 1 ? prev.slice(0, Math.max(1, prev.length - trend.length)).reduce((s, d) => s + d.calls, 0) : currentCalls * 0.9;
    const tokens = trend.reduce((s, d) => s + d.tokens, 0);
    const prevTokens = tokens * 0.84;
    const success = trend.reduce((s, d) => s + d.successRate, 0) / Math.max(trend.length, 1);
    const prevSuccess = success + 0.08;
    const publishedAgents = store.agents.filter((a) => a.status === "published").length;
    const activeApps = store.apps.filter((a) => a.status === "online").length;
    const reusedAssets = [...store.models, ...store.datasets, ...store.tools].filter(
      (item) => ("consumers" in item ? item.consumers.length > 1 : item.usedBy.length > 1),
    ).length;
    const totalAssets = store.models.length + store.datasets.length + store.tools.length;
    const reuseRate = (reusedAssets / totalAssets) * 100;
    const dates = trend.map((d) => d.date);

    const kpis: KpiMetric[] = [
      {
        key: "calls",
        label: "模型调用次数",
        value: currentCalls,
        display: formatCompact(currentCalls),
        change: prevCalls ? ((currentCalls - prevCalls) / prevCalls) * 100 : 12.4,
        changeUnit: "percent" as const,
        trend: "up" as const,
        positive: true,
        hint: "统计范围内所有已发布模型的成功与失败调用总和，含 Agent 内部调用。",
        sparkline: sparkFrom(trend.map((d) => d.calls), dates),
      },
      {
        key: "apps",
        label: "活跃应用数",
        value: activeApps,
        display: formatNumber(activeApps),
        change: 2,
        changeUnit: "count" as const,
        trend: "up" as const,
        positive: true,
        hint: "当前状态为「运行中」的应用数量，不含维护和已下线应用。",
        sparkline: sparkFrom(trend.map((_, i) => activeApps - 1 + (i > 3 ? 1 : 0)), dates),
      },
      {
        key: "agents",
        label: "已发布 Agent",
        value: publishedAgents,
        display: formatNumber(publishedAgents),
        change: 1,
        changeUnit: "count" as const,
        trend: "up" as const,
        positive: true,
        hint: "完成评测并发布到生产环境的 Agent 数量。草稿和审核中不计入。",
        sparkline: sparkFrom(trend.map((_, i) => publishedAgents - (i < 4 ? 1 : 0)), dates),
      },
      {
        key: "reuse",
        label: "AI 资产复用率",
        value: reuseRate,
        display: formatPercent(reuseRate, 1),
        change: 5.1,
        changeUnit: "pp" as const,
        trend: "up" as const,
        positive: true,
        hint: "被 2 个及以上应用/Agent 引用的模型、数据集和工具占比。复用率越高，平台治理收益越大。",
        sparkline: sparkFrom(trend.map((_, i) => reuseRate - 4 + i * 0.4), dates),
      },
      {
        key: "success",
        label: "调用成功率",
        value: success,
        display: formatPercent(success, 2),
        change: Number((success - prevSuccess).toFixed(2)),
        changeUnit: "pp" as const,
        trend: (success >= prevSuccess ? "up" : "down") as "up" | "down",
        positive: success >= prevSuccess,
        hint: "非 error / timeout / throttled 的请求占比，是平台 SLO 的核心指标。",
        sparkline: sparkFrom(trend.map((d) => d.successRate), dates),
      },
      {
        key: "tokens",
        label: "Token 消耗量",
        value: tokens,
        display: formatCompact(tokens),
        change: ((tokens - prevTokens) / prevTokens) * 100,
        changeUnit: "percent" as const,
        trend: "up" as const,
        positive: false,
        hint: "输入 + 输出 Token 总量。增长需结合业务量和单次会话 Token 效率一起看。",
        sparkline: sparkFrom(trend.map((d) => d.tokens), dates),
      },
    ];

    const modelUsage = store.models
      .filter((m) => m.status === "published")
      .map((m) => ({
        id: m.id,
        name: m.displayName,
        calls: m.callCount30d,
        tokens: m.tokenCount30d,
        cost: Number(((m.tokenCount30d / 1000) * ((m.inputPrice + m.outputPrice) / 2 / 1000) * 1000).toFixed(0)),
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 6);

    const appRanking = store.apps
      .map((a) => ({
        id: a.id,
        name: a.name,
        calls: a.callCount30d,
        successRate: a.successRate,
        cost: a.spentToday * 18,
      }))
      .sort((a, b) => b.calls - a.calls);

    return {
      range,
      kpis,
      trend: store.dailyMetrics.slice(range === "30d" ? -30 : range === "7d" ? -7 : -2),
      modelUsage,
      appRanking,
      alerts: store.alerts.filter((a) => a.status !== "resolved").slice(0, 5),
      activities: store.audits.slice(0, 6),
      health: {
        modelsOnline: store.models.filter((m) => m.status === "published").length,
        modelsTotal: store.models.length,
        agentsPublished: publishedAgents,
        appsOnline: activeApps,
        firingAlerts: store.alerts.filter((a) => a.status === "firing").length,
      },
    };
  },

  async listModels(query: ListQuery = {}): Promise<Paginated<ModelRecord>> {
    await wait(220);
    const items = getStore().models.filter((item) => {
      const text = `${item.name} ${item.displayName} ${item.provider} ${item.tags.join(" ")}`;
      return matchText(text, query.search) && (!query.status || item.status === query.status) && (!query.type || item.type === query.type);
    });
    return paginate(items, query);
  },

  async getModel(id: string): Promise<ModelRecord | undefined> {
    await wait(180);
    return getStore().models.find((item) => item.id === id);
  },

  async createModel(input: Pick<ModelRecord, "name" | "displayName" | "provider" | "type" | "version" | "description" | "contextWindow">): Promise<ModelRecord> {
    await wait(360);
    const record: ModelRecord = {
      ...input,
      id: createId("model"),
      status: "draft",
      inputPrice: 1,
      outputPrice: 3,
      latencyP50: 500,
      latencyP99: 1400,
      successRate: 0,
      callCount30d: 0,
      tokenCount30d: 0,
      owner: { id: "user-zhang", name: "张启明", department: "平台工程部" },
      tags: ["新建"],
      endpoint: "https://api.nexus.xinghe.local/v1/chat/completions",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      consumers: [],
    };
    updateStore((draft) => {
      draft.models.unshift(record);
    });
    writeAudit("注册模型", "model", record.id, record.displayName);
    return record;
  },

  async updateModel(id: string, patch: Partial<Pick<ModelRecord, "status" | "description" | "tags">>): Promise<ModelRecord> {
    await wait(240);
    let updated: ModelRecord | undefined;
    updateStore((draft) => {
      const target = draft.models.find((item) => item.id === id);
      if (!target) return;
      Object.assign(target, patch, { updatedAt: nowIso() });
      updated = { ...target };
    });
    if (!updated) throw new Error("模型不存在");
    if (patch.status) writeAudit("更新模型状态", "model", id, `状态变更为 ${patch.status}`);
    return updated;
  },

  async listDatasets(query: ListQuery = {}): Promise<Paginated<DatasetRecord>> {
    await wait(220);
    const items = getStore().datasets.filter((item) => {
      const text = `${item.name} ${item.tags.join(" ")} ${item.description}`;
      return matchText(text, query.search) && (!query.status || item.status === query.status) && (!query.type || item.type === query.type);
    });
    return paginate(items, query);
  },

  async updateDataset(id: string, patch: Partial<Pick<DatasetRecord, "status">>): Promise<void> {
    await wait(220);
    updateStore((draft) => {
      const target = draft.datasets.find((item) => item.id === id);
      if (target) Object.assign(target, patch, { updatedAt: nowIso() });
    });
    writeAudit("更新数据集状态", "dataset", id, `状态变更为 ${patch.status ?? ""}`);
  },

  async listTools(query: ListQuery = {}): Promise<Paginated<ToolRecord>> {
    await wait(220);
    const items = getStore().tools.filter((item) => {
      const text = `${item.name} ${item.displayName} ${item.description}`;
      return matchText(text, query.search) && (!query.status || item.status === query.status) && (!query.type || item.type === query.type);
    });
    return paginate(items, query);
  },

  async updateTool(id: string, patch: Partial<Pick<ToolRecord, "status">>): Promise<void> {
    await wait(220);
    updateStore((draft) => {
      const target = draft.tools.find((item) => item.id === id);
      if (target) Object.assign(target, patch, { updatedAt: nowIso() });
    });
    writeAudit("更新工具状态", "tool", id, `状态变更为 ${patch.status ?? ""}`);
  },

  async listAgents(query: ListQuery = {}): Promise<Paginated<AgentRecord>> {
    await wait(220);
    const items = getStore().agents.filter((item) => {
      const text = `${item.name} ${item.tags.join(" ")} ${item.description}`;
      return matchText(text, query.search) && (!query.status || item.status === query.status);
    });
    return paginate(items, query);
  },

  async getAgent(id: string): Promise<AgentRecord | undefined> {
    await wait(180);
    return getStore().agents.find((item) => item.id === id);
  },

  async createAgent(input: {
    name: string;
    description: string;
    modelId: string;
    toolIds: string[];
    datasetIds?: string[];
    version?: string;
    team?: string;
    publish?: boolean;
  }): Promise<AgentRecord> {
    await wait(360);
    const store = getStore();
    const model = store.models.find((item) => item.id === input.modelId);
    if (!model) throw new Error("所选模型不存在");
    if (input.publish) {
      const reason = publishBlockReason(store, { modelId: input.modelId, toolIds: input.toolIds });
      if (reason) throw new Error(reason);
    }
    const record: AgentRecord = {
      id: createId("agent"),
      name: input.name,
      version: input.version?.trim() || "0.1.0",
      status: input.publish ? "published" : "draft",
      modelId: input.modelId,
      toolIds: input.toolIds,
      datasetIds: input.datasetIds ?? [],
      owner: { id: "user-zhang", name: "张启明", department: input.team || "平台工程部" },
      description: input.description,
      callCount30d: 0,
      successRate: 0,
      avgLatency: 0,
      tags: input.publish ? ["生产"] : ["草稿"],
      createdAt: nowIso(),
      updatedAt: nowIso(),
      publishedAt: input.publish ? nowIso() : undefined,
    };
    updateStore((draft) => {
      draft.agents.unshift(record);
      const target = draft.models.find((item) => item.id === record.modelId);
      if (target && !target.consumers.includes(record.id)) target.consumers.push(record.id);
      record.toolIds.forEach((toolId) => {
        const tool = draft.tools.find((item) => item.id === toolId);
        if (tool && !tool.usedBy.includes(record.id)) tool.usedBy.push(record.id);
      });
      record.datasetIds.forEach((datasetId) => {
        const dataset = draft.datasets.find((item) => item.id === datasetId);
        if (dataset && !dataset.usedBy.includes(record.id)) dataset.usedBy.push(record.id);
      });
    });
    writeAudit(input.publish ? "发布 Agent" : "创建 Agent", "agent", record.id, record.name);
    return record;
  },

  async updateAgent(id: string, patch: Partial<Pick<AgentRecord, "status" | "version">>): Promise<AgentRecord> {
    await wait(260);
    if (patch.status === "published") {
      return api.publishAgent(id);
    }
    let updated: AgentRecord | undefined;
    updateStore((draft) => {
      const target = draft.agents.find((item) => item.id === id);
      if (!target) return;
      Object.assign(target, patch, { updatedAt: nowIso() });
      updated = { ...target };
    });
    if (!updated) throw new Error("Agent 不存在");
    writeAudit("更新 Agent", "agent", id, `状态变更为 ${patch.status ?? updated.status}`);
    return updated;
  },

  async publishAgent(id: string): Promise<AgentRecord> {
    await wait(260);
    const store = getStore();
    const agent = store.agents.find((item) => item.id === id);
    if (!agent) throw new Error("Agent 不存在");
    const reason = publishBlockReason(store, agent);
    if (reason) throw new Error(reason);
    let updated: AgentRecord | undefined;
    updateStore((draft) => {
      const target = draft.agents.find((item) => item.id === id);
      if (!target) return;
      target.status = "published";
      target.publishedAt = nowIso();
      target.updatedAt = nowIso();
      target.tags = Array.from(new Set([...target.tags.filter((tag) => tag !== "草稿"), "生产"]));
      updated = { ...target };
    });
    if (!updated) throw new Error("Agent 不存在");
    writeAudit("发布 Agent", "agent", id, updated.name);
    return updated;
  },

  async listApps(query: ListQuery = {}): Promise<Paginated<AppRecord>> {
    await wait(220);
    const items = getStore().apps.filter((item) => {
      const text = `${item.name} ${item.slug} ${item.description}`;
      return matchText(text, query.search) && (!query.status || item.status === query.status) && (!query.type || item.env === query.type);
    });
    return paginate(items, query);
  },

  async getApp(id: string): Promise<AppRecord | undefined> {
    await wait(180);
    return getStore().apps.find((item) => item.id === id);
  },

  async createApp(input: {
    name: string;
    slug?: string;
    description: string;
    env: AppRecord["env"];
    team?: string;
    modelIds?: string[];
    agentIds?: string[];
  }): Promise<AppRecord> {
    await wait(360);
    const store = getStore();
    const agentIds = input.agentIds ?? [];
    const modelIds = new Set(input.modelIds ?? []);
    agentIds.forEach((id) => {
      const agent = store.agents.find((item) => item.id === id);
      if (!agent) throw new Error("所选 Agent 不存在");
      if (agent.status !== "published") throw new Error(`Agent「${agent.name}」未发布，无法绑定到应用`);
      modelIds.add(agent.modelId);
    });
    Array.from(modelIds).forEach((id) => {
      const model = store.models.find((item) => item.id === id);
      if (!model) throw new Error("所选模型不存在");
      if (model.status !== "published") throw new Error(`模型「${model.displayName}」未发布，无法绑定到应用`);
    });
    if (modelIds.size === 0 && agentIds.length === 0) {
      throw new Error("请至少选择一个已发布的模型或 Agent");
    }
    const slug =
      input.slug?.trim() ||
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") ||
      createId("app");
    const record: AppRecord = {
      id: createId("app"),
      name: input.name,
      slug,
      status: "online",
      env: input.env,
      owner: { id: "user-zhang", name: "张启明", department: input.team || "平台工程部" },
      description: input.description,
      modelIds: Array.from(modelIds),
      agentIds,
      qpsLimit: 10,
      dailyBudget: 1000,
      spentToday: 0,
      callCount30d: 0,
      successRate: 100,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    updateStore((draft) => {
      draft.apps.unshift(record);
      record.modelIds.forEach((modelId) => {
        const model = draft.models.find((item) => item.id === modelId);
        if (model && !model.consumers.includes(record.id)) model.consumers.push(record.id);
      });
    });
    writeAudit("创建应用", "app", record.id, record.name);
    return record;
  },

  async updateApp(id: string, patch: Partial<Pick<AppRecord, "status" | "qpsLimit" | "dailyBudget">>): Promise<AppRecord> {
    await wait(240);
    let updated: AppRecord | undefined;
    updateStore((draft) => {
      const target = draft.apps.find((item) => item.id === id);
      if (!target) return;
      Object.assign(target, patch, { updatedAt: nowIso() });
      updated = { ...target };
    });
    if (!updated) throw new Error("应用不存在");
    writeAudit("更新应用", "app", id, JSON.stringify(patch));
    return updated;
  },

  async listCredentials(query: ListQuery = {}): Promise<Paginated<CredentialRecord>> {
    await wait(200);
    const items = getStore().credentials.filter((item) => {
      const text = `${item.name} ${item.prefix}`;
      return matchText(text, query.search) && (!query.status || item.status === query.status);
    });
    return paginate(items, query);
  },

  async createCredential(input: { name: string; appId: string; env: CredentialRecord["env"]; scopes: string[] }): Promise<CredentialRecord> {
    await wait(300);
    const prefix = `${input.env === "prod" ? "nx_live" : "nx_test"}_${createId("k").slice(-4)}`;
    const record: CredentialRecord = {
      id: createId("key"),
      name: input.name,
      appId: input.appId,
      prefix,
      secret: `${prefix}${createId("sec").replace(/-/g, "")}`,
      status: "active",
      scopes: input.scopes,
      env: input.env,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
      createdAt: nowIso(),
      createdBy: "张启明",
    };
    updateStore((draft) => {
      draft.credentials.unshift(record);
    });
    writeAudit("创建 API 凭证", "credential", record.id, record.name);
    return record;
  },

  async updateCredential(id: string, status: CredentialStatus): Promise<void> {
    await wait(220);
    updateStore((draft) => {
      const target = draft.credentials.find((item) => item.id === id);
      if (target) target.status = status;
    });
    writeAudit("更新 API 凭证", "credential", id, `状态 ${status}`);
  },

  async listLogs(query: ListQuery & { appId?: string; modelId?: string; callStatus?: string } = {}): Promise<Paginated<CallLogRecord>> {
    await wait(240);
    const lookup = getStore();
    const items = lookup.logs
      .filter((item) => {
        const appName = lookup.apps.find((app) => app.id === item.appId)?.name ?? "";
        const modelName = lookup.models.find((model) => model.id === item.modelId)?.displayName ?? "";
        const text = `${item.id} ${item.requestId} ${item.traceId ?? ""} ${item.errorCode ?? ""} ${item.errorMessage ?? ""} ${appName} ${modelName}`;
        return (
          matchText(text, query.search) &&
          (!query.appId || item.appId === query.appId) &&
          (!query.modelId || item.modelId === query.modelId) &&
          (!query.callStatus || item.status === query.callStatus)
        );
      })
      .sort((a, b) => +new Date(b.time) - +new Date(a.time));
    return paginate(items, { ...query, pageSize: query.pageSize ?? 16 });
  },

  async getLog(id: string): Promise<CallLogRecord | undefined> {
    await wait(120);
    return getStore().logs.find((item) => item.id === id || item.requestId === id);
  },

  async listAlerts(query: ListQuery = {}): Promise<Paginated<AlertRecord>> {
    await wait(200);
    const items = getStore()
      .alerts.filter((item) => {
        const text = `${item.title} ${item.message} ${item.logId ?? ""} ${item.traceId ?? ""}`;
        return matchText(text, query.search) && (!query.status || item.status === query.status) && (!query.type || item.severity === query.type);
      })
      .sort((a, b) => +new Date(b.firedAt) - +new Date(a.firedAt));
    return paginate(items, query);
  },

  async getAlert(id: string): Promise<AlertRecord | undefined> {
    await wait(120);
    return getStore().alerts.find((item) => item.id === id);
  },

  async updateAlert(
    id: string,
    patch: AlertRecord["status"] | { status?: AlertRecord["status"]; note?: string },
  ): Promise<void> {
    await wait(200);
    const next = typeof patch === "string" ? { status: patch } : patch;
    updateStore((draft) => {
      const target = draft.alerts.find((item) => item.id === id);
      if (!target) return;
      if (next.status) {
        target.status = next.status;
        if (next.status === "ack") target.ackAt = nowIso();
        if (next.status === "resolved") target.resolvedAt = nowIso();
      }
      if (next.note?.trim()) {
        target.notes = [
          ...(target.notes ?? []),
          { time: nowIso(), actor: "张启明", text: next.note.trim() },
        ];
      }
    });
    writeAudit("更新告警", "alert", id, JSON.stringify(next));
  },

  async listTraces(query: ListQuery = {}): Promise<Paginated<TraceRecord>> {
    await wait(220);
    const items = getStore()
      .traces.filter((item) => {
        const text = `${item.requestId} ${item.id} ${item.logId ?? ""}`;
        return matchText(text, query.search) && (!query.status || item.status === query.status);
      })
      .sort((a, b) => +new Date(b.startAt) - +new Date(a.startAt));
    return paginate(items, query);
  },

  async getTrace(id: string): Promise<TraceRecord | undefined> {
    await wait(180);
    return getStore().traces.find((item) => item.id === id || item.requestId === id || item.logId === id);
  },

  async listUsers(query: ListQuery = {}): Promise<Paginated<UserRecord>> {
    await wait(200);
    const items = getStore().users.filter((item) => {
      const text = `${item.name} ${item.email} ${item.department}`;
      return matchText(text, query.search) && (!query.status || item.status === query.status) && (!query.type || item.role === query.type);
    });
    return paginate(items, query);
  },

  async updateUser(id: string, patch: Partial<Pick<UserRecord, "role" | "status">>): Promise<void> {
    await wait(220);
    updateStore((draft) => {
      const target = draft.users.find((item) => item.id === id);
      if (target) Object.assign(target, patch);
    });
    writeAudit("更新用户", "user", id, JSON.stringify(patch));
  },

  async inviteUser(input: { name: string; email: string; role: UserRole; department: string }): Promise<UserRecord> {
    await wait(300);
    const record: UserRecord = {
      id: createId("user"),
      name: input.name,
      email: input.email,
      role: input.role,
      department: input.department,
      status: "invited",
      lastActiveAt: nowIso(),
      createdAt: nowIso(),
    };
    updateStore((draft) => {
      draft.users.unshift(record);
    });
    writeAudit("邀请用户", "user", record.id, `${record.name} / ${record.role}`);
    return record;
  },

  async listAudits(query: ListQuery = {}): Promise<Paginated<ReturnType<typeof getStore>["audits"][number]>> {
    await wait(200);
    const items = getStore().audits.filter((item) => {
      const actor = getStore().users.find((u) => u.id === item.actorId)?.name ?? "";
      const text = `${item.action} ${item.detail} ${actor} ${item.resourceType}`;
      return matchText(text, query.search) && (!query.status || item.result === query.status);
    });
    return paginate(items, { ...query, pageSize: query.pageSize ?? 16 });
  },

  async listNotifications() {
    await wait(120);
    return getStore().notifications;
  },

  async markNotificationRead(id: string) {
    updateStore((draft) => {
      const target = draft.notifications.find((item) => item.id === id);
      if (target) target.read = true;
    });
  },

  async markAllNotificationsRead() {
    updateStore((draft) => {
      draft.notifications.forEach((item) => {
        item.read = true;
      });
    });
  },

  async getSettings(): Promise<PlatformSettings> {
    await wait(160);
    return getStore().settings;
  },

  async saveSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
    await wait(280);
    let next = getStore().settings;
    updateStore((draft) => {
      draft.settings = { ...draft.settings, ...patch };
      next = draft.settings;
    });
    writeAudit("更新系统设置", "settings", "platform", JSON.stringify(patch));
    return next;
  },

  async getDependencies(): Promise<{ nodes: DependencyNode[]; edges: DependencyEdge[] }> {
    await wait(240);
    const store = getStore();
    const nodes: DependencyNode[] = [
      ...store.models.map((item) => ({ id: item.id, name: item.displayName, kind: "model" as const, status: item.status })),
      ...store.datasets.map((item) => ({ id: item.id, name: item.name, kind: "dataset" as const, status: item.status })),
      ...store.tools.map((item) => ({ id: item.id, name: item.displayName, kind: "tool" as const, status: item.status })),
      ...store.agents.map((item) => ({ id: item.id, name: item.name, kind: "agent" as const, status: item.status })),
      ...store.apps.map((item) => ({ id: item.id, name: item.name, kind: "app" as const, status: item.status })),
    ];
    const edges: DependencyEdge[] = [];
    store.agents.forEach((agent) => {
      edges.push({ from: agent.modelId, to: agent.id, relation: "驱动" });
      agent.toolIds.forEach((id) => edges.push({ from: id, to: agent.id, relation: "被调用" }));
      agent.datasetIds.forEach((id) => edges.push({ from: id, to: agent.id, relation: "训练/检索" }));
    });
    store.apps.forEach((app) => {
      app.modelIds.forEach((id) => edges.push({ from: id, to: app.id, relation: "调用" }));
      app.agentIds.forEach((id) => edges.push({ from: id, to: app.id, relation: "编排" }));
    });
    return { nodes, edges };
  },

  async searchAll(keyword: string) {
    await wait(140);
    const q = keyword.trim().toLowerCase();
    if (!q) return [];
    const store = getStore();
    const hits: { href: string; title: string; subtitle: string; kind: string }[] = [];
    store.models.forEach((item) => {
      if (`${item.displayName} ${item.name}`.toLowerCase().includes(q)) {
        hits.push({ href: `/assets/models/${item.id}`, title: item.displayName, subtitle: item.provider, kind: "模型" });
      }
    });
    store.agents.forEach((item) => {
      if (item.name.toLowerCase().includes(q)) {
        hits.push({ href: `/assets/agents/${item.id}`, title: item.name, subtitle: item.version, kind: "Agent" });
      }
    });
    store.apps.forEach((item) => {
      if (`${item.name} ${item.slug}`.toLowerCase().includes(q)) {
        hits.push({ href: `/developer/apps/${item.id}`, title: item.name, subtitle: item.slug, kind: "应用" });
      }
    });
    store.users.forEach((item) => {
      if (`${item.name} ${item.email}`.toLowerCase().includes(q)) {
        hits.push({ href: "/admin/users", title: item.name, subtitle: item.email, kind: "用户" });
      }
    });
    return hits.slice(0, 8);
  },

  async runPlayground(input: InvokeInput): Promise<PlaygroundResult> {
    const store = getStore();
    const bundle = simulateInvocation(store, input);
    await wait(Math.min(1100, Math.max(420, Math.round(bundle.result.latency * 0.4))));
    updateStore((draft) => {
      draft.playgroundHistory.unshift(bundle.result);
      draft.logs.unshift(bundle.log);
      draft.traces.unshift(bundle.trace);
      if (bundle.alert) {
        draft.alerts.unshift(bundle.alert);
        draft.notifications.unshift({
          id: createId("nt"),
          title: bundle.alert.title,
          body: bundle.alert.message,
          type: "alert",
          read: false,
          href: `/ops/traces/${bundle.alert.traceId}`,
          createdAt: bundle.alert.firedAt,
        });
      }
      const app = draft.apps.find((item) => item.id === bundle.log.appId);
      if (app) {
        app.callCount30d += 1;
        app.spentToday += bundle.log.cost;
        const recent = draft.logs.filter((item) => item.appId === app.id);
        const ok = recent.filter((item) => item.status === "success").length;
        app.successRate = Number(((ok / Math.max(recent.length, 1)) * 100).toFixed(1));
      }
      const agent = bundle.log.agentId ? draft.agents.find((item) => item.id === bundle.log.agentId) : undefined;
      if (agent) {
        agent.callCount30d += 1;
        agent.avgLatency = Math.round((agent.avgLatency * 0.7 + bundle.log.latency * 0.3) || bundle.log.latency);
        const recent = draft.logs.filter((item) => item.agentId === agent.id);
        const ok = recent.filter((item) => item.status === "success").length;
        agent.successRate = Number(((ok / Math.max(recent.length, 1)) * 100).toFixed(1));
      }
      const model = draft.models.find((item) => item.id === bundle.log.modelId);
      if (model) {
        model.callCount30d += 1;
        model.tokenCount30d += bundle.log.inputTokens + bundle.log.outputTokens;
        const recent = draft.logs.filter((item) => item.modelId === model.id);
        const ok = recent.filter((item) => item.status === "success").length;
        model.successRate = Number(((ok / Math.max(recent.length, 1)) * 100).toFixed(2));
      }
      const today = new Date().toISOString().slice(0, 10);
      let metric = draft.dailyMetrics.find((item) => item.date === today);
      if (!metric) {
        metric = { date: today, calls: 0, tokens: 0, cost: 0, successRate: 100, latencyP95: bundle.log.latency };
        draft.dailyMetrics.push(metric);
      }
      metric.calls += 1;
      metric.tokens += bundle.log.inputTokens + bundle.log.outputTokens;
      metric.cost = Number((metric.cost + bundle.log.cost).toFixed(2));
      const todayLogs = draft.logs.filter((item) => item.time.slice(0, 10) === today);
      const okToday = todayLogs.filter((item) => item.status === "success").length;
      metric.successRate = Number(((okToday / Math.max(todayLogs.length, 1)) * 100).toFixed(2));
      const latencies = todayLogs.map((item) => item.latency).sort((a, b) => a - b);
      metric.latencyP95 = latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))] ?? metric.latencyP95;
    });
    writeAudit("Playground 模拟调用", "log", bundle.log.id, bundle.log.requestId);
    return bundle.result;
  },

  async getPlaygroundHistory(): Promise<PlaygroundResult[]> {
    await wait(120);
    return getStore().playgroundHistory.slice(0, 12);
  },

  async getMonitoring(range: TimeRange) {
    await wait(240);
    const store = getStore();
    const trend = sliceTrend(store.dailyMetrics, range);
    const days = range === "24h" ? 1 : range === "7d" ? 7 : 30;
    const cutoff = Date.now() - days * 86_400_000;
    const recentLogs = store.logs.filter((item) => +new Date(item.time) >= cutoff);
    return {
      trend,
      byModel: store.models
        .filter((m) => m.status === "published")
        .map((m) => {
          const logs = recentLogs.filter((item) => item.modelId === m.id);
          const latencies = logs.map((item) => item.latency).sort((a, b) => a - b);
          const ok = logs.filter((item) => item.status === "success").length;
          return {
            id: m.id,
            name: m.displayName,
            latencyP50: logs.length ? latencies[Math.floor(latencies.length * 0.5)] ?? m.latencyP50 : m.latencyP50,
            latencyP99: logs.length ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.99))] ?? m.latencyP99 : m.latencyP99,
            successRate: logs.length ? Number(((ok / logs.length) * 100).toFixed(2)) : m.successRate,
            calls: logs.length || m.callCount30d,
          };
        }),
      byApp: store.apps.map((a) => {
        const logs = recentLogs.filter((item) => item.appId === a.id);
        const ok = logs.filter((item) => item.status === "success").length;
        return {
          id: a.id,
          name: a.name,
          status: a.status,
          successRate: logs.length ? Number(((ok / logs.length) * 100).toFixed(1)) : a.successRate,
          spentToday: a.spentToday,
          dailyBudget: a.dailyBudget,
          qpsLimit: a.qpsLimit,
        };
      }),
    };
  },

  async getCost() {
    await wait(240);
    const store = getStore();
    const byModel = store.models.map((m) => ({
      name: m.displayName,
      cost: Number(((m.tokenCount30d / 1_000_000) * (m.inputPrice * 0.6 + m.outputPrice * 0.4)).toFixed(0)),
    }));
    const byApp = store.apps.map((a) => ({
      name: a.name,
      owner: a.owner.department,
      cost: Math.round(a.spentToday * 22),
      budget: a.dailyBudget * 30,
    }));
    const byDeptMap = new Map<string, number>();
    byApp.forEach((item) => {
      byDeptMap.set(item.owner, (byDeptMap.get(item.owner) ?? 0) + item.cost);
    });
    const byDept = Array.from(byDeptMap.entries()).map(([name, cost]) => ({ name, cost }));
    const monthCost = byModel.reduce((s, i) => s + i.cost, 0);
    return {
      monthCost,
      budget: store.settings.monthlyBudget,
      byModel: byModel.sort((a, b) => b.cost - a.cost),
      byApp: byApp.sort((a, b) => b.cost - a.cost),
      byDept,
      trend: store.dailyMetrics.map((d) => ({ date: d.date, cost: d.cost })),
    };
  },

  lookup() {
    const store = getStore();
    return {
      models: store.models,
      apps: store.apps,
      agents: store.agents,
      tools: store.tools,
      datasets: store.datasets,
      users: store.users,
    };
  },

  async resetDemo() {
    await wait(200);
    resetStore();
  },
};

export const statusLabel: Record<string, string> = {
  draft: "草稿",
  reviewing: "审核中",
  published: "已发布",
  deprecated: "已废弃",
  offline: "已下线",
  online: "运行中",
  degraded: "降级",
  maintenance: "维护中",
  active: "启用",
  expiring: "即将过期",
  revoked: "已吊销",
  rotated: "已轮换",
  disabled: "停用",
  invited: "待加入",
  admin: "平台管理员",
  developer: "开发者",
  algorithm: "算法工程师",
  pm: "产品经理",
  ops: "运维工程师",
  viewer: "只读",
  firing: "告警中",
  ack: "处理中",
  resolved: "已恢复",
  critical: "严重",
  warning: "警告",
  info: "提示",
  success: "成功",
  error: "失败",
  timeout: "超时",
  throttled: "限流",
  llm: "LLM",
  embedding: "Embedding",
  vision: "Vision",
  rerank: "Rerank",
  speech: "Speech",
  multimodal: "Multimodal",
  sft: "SFT",
  pretrain: "预训练",
  eval: "评测",
  rag: "RAG",
  preference: "偏好",
  redteam: "红队",
  http: "HTTP",
  function: "Function",
  mcp: "MCP",
  retrieval: "Retrieval",
  prod: "生产",
  staging: "预发",
  dev: "开发",
  denied: "拒绝",
  failed: "失败",
};
