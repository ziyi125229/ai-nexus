export type TimeRange = "24h" | "7d" | "30d";

export type AssetStatus = "draft" | "reviewing" | "published" | "deprecated" | "offline";
export type RuntimeStatus = "online" | "degraded" | "offline" | "maintenance";
export type Severity = "critical" | "warning" | "info";
export type AlertStatus = "firing" | "ack" | "resolved";
export type UserRole = "admin" | "developer" | "algorithm" | "pm" | "ops" | "viewer";
export type UserStatus = "active" | "disabled" | "invited";
export type EnvType = "prod" | "staging" | "dev";
export type CallStatus = "success" | "error" | "timeout" | "throttled";
export type ModelType = "llm" | "embedding" | "vision" | "rerank" | "speech" | "multimodal";
export type DatasetType = "sft" | "pretrain" | "eval" | "rag" | "preference" | "redteam";
export type ToolType = "http" | "function" | "mcp" | "retrieval";
export type AgentStatus = AssetStatus;
export type CredentialStatus = "active" | "expiring" | "revoked" | "rotated";

export interface OwnerRef {
  id: string;
  name: string;
  department: string;
}

export interface SparkPoint {
  t: string;
  v: number;
}

export interface KpiMetric {
  key: string;
  label: string;
  value: number;
  display: string;
  change: number;
  changeUnit: "percent" | "pp" | "count";
  trend: "up" | "down" | "flat";
  positive: boolean;
  hint: string;
  sparkline: SparkPoint[];
}

export interface DailyMetric {
  date: string;
  calls: number;
  tokens: number;
  cost: number;
  successRate: number;
  latencyP95: number;
}

export interface ModelRecord {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  version: string;
  type: ModelType;
  status: AssetStatus;
  contextWindow: number;
  inputPrice: number;
  outputPrice: number;
  latencyP50: number;
  latencyP99: number;
  successRate: number;
  callCount30d: number;
  tokenCount30d: number;
  owner: OwnerRef;
  tags: string[];
  description: string;
  endpoint: string;
  createdAt: string;
  updatedAt: string;
  consumers: string[];
}

export interface DatasetRecord {
  id: string;
  name: string;
  type: DatasetType;
  status: AssetStatus;
  records: number;
  sizeGb: number;
  qualityScore: number;
  owner: OwnerRef;
  usedBy: string[];
  tags: string[];
  description: string;
  updatedAt: string;
  createdAt: string;
}

export interface ToolRecord {
  id: string;
  name: string;
  displayName: string;
  type: ToolType;
  status: AssetStatus;
  latencyP50: number;
  successRate: number;
  callCount30d: number;
  owner: OwnerRef;
  description: string;
  endpoint?: string;
  schemaPreview: string;
  tags: string[];
  usedBy: string[];
  updatedAt: string;
}

export interface AgentRecord {
  id: string;
  name: string;
  version: string;
  status: AgentStatus;
  modelId: string;
  toolIds: string[];
  datasetIds: string[];
  owner: OwnerRef;
  description: string;
  callCount30d: number;
  successRate: number;
  avgLatency: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface AppRecord {
  id: string;
  name: string;
  slug: string;
  status: RuntimeStatus;
  env: EnvType;
  owner: OwnerRef;
  description: string;
  modelIds: string[];
  agentIds: string[];
  qpsLimit: number;
  dailyBudget: number;
  spentToday: number;
  callCount30d: number;
  successRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialRecord {
  id: string;
  name: string;
  appId: string;
  prefix: string;
  secret: string;
  status: CredentialStatus;
  scopes: string[];
  env: EnvType;
  lastUsedAt?: string;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
}

export interface CallLogRecord {
  id: string;
  time: string;
  appId: string;
  modelId: string;
  agentId?: string;
  status: CallStatus;
  latency: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  requestId: string;
  traceId?: string;
  prompt?: string;
  output?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface AlertNote {
  time: string;
  actor: string;
  text: string;
}

export interface AlertRecord {
  id: string;
  severity: Severity;
  status: AlertStatus;
  title: string;
  message: string;
  source: string;
  resourceType: "model" | "app" | "agent" | "tool" | "system";
  resourceId: string;
  firedAt: string;
  ackAt?: string;
  resolvedAt?: string;
  logId?: string;
  traceId?: string;
  notes?: AlertNote[];
}

export interface TraceSpan {
  id: string;
  name: string;
  type: "gateway" | "agent" | "model" | "tool" | "retrieval" | "guardrail" | "output";
  startMs: number;
  durationMs: number;
  status: CallStatus;
  detail: string;
  startedAt?: string;
  inputSummary?: string;
  outputSummary?: string;
  errorMessage?: string;
}

export interface TraceRecord {
  id: string;
  requestId: string;
  logId?: string;
  appId: string;
  agentId?: string;
  modelId: string;
  status: CallStatus;
  startAt: string;
  durationMs: number;
  prompt?: string;
  output?: string;
  spans: TraceSpan[];
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: UserStatus;
  lastActiveAt: string;
  createdAt: string;
}

export interface AuditRecord {
  id: string;
  time: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  result: "success" | "denied" | "failed";
  ip: string;
  detail: string;
}

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  type: "alert" | "review" | "system" | "cost";
  read: boolean;
  href: string;
  createdAt: string;
}

export interface PlatformSettings {
  tenantName: string;
  timezone: string;
  defaultModelId: string;
  enableGuardrails: boolean;
  enableAuditLog: boolean;
  retentionDays: number;
  monthlyBudget: number;
  alertEmail: string;
  allowExternalModels: boolean;
}

export interface PlaygroundResult {
  id: string;
  modelId: string;
  prompt: string;
  output: string;
  latency: number;
  inputTokens: number;
  outputTokens: number;
  finishReason: string;
  createdAt: string;
  appId?: string;
  agentId?: string;
  requestId?: string;
  traceId?: string;
  logId?: string;
  status?: CallStatus;
  errorMessage?: string;
}

export interface StoreState {
  models: ModelRecord[];
  datasets: DatasetRecord[];
  tools: ToolRecord[];
  agents: AgentRecord[];
  apps: AppRecord[];
  credentials: CredentialRecord[];
  logs: CallLogRecord[];
  alerts: AlertRecord[];
  traces: TraceRecord[];
  users: UserRecord[];
  audits: AuditRecord[];
  notifications: NotificationRecord[];
  settings: PlatformSettings;
  playgroundHistory: PlaygroundResult[];
  dailyMetrics: DailyMetric[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
}

export interface ListQuery {
  search?: string;
  status?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}

export interface DependencyNode {
  id: string;
  name: string;
  kind: "model" | "dataset" | "tool" | "agent" | "app";
  status: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  relation: string;
}

export interface OverviewData {
  range: TimeRange;
  kpis: KpiMetric[];
  trend: DailyMetric[];
  modelUsage: { id: string; name: string; calls: number; tokens: number; cost: number }[];
  appRanking: { id: string; name: string; calls: number; successRate: number; cost: number }[];
  alerts: AlertRecord[];
  activities: AuditRecord[];
  health: {
    modelsOnline: number;
    modelsTotal: number;
    agentsPublished: number;
    appsOnline: number;
    firingAlerts: number;
  };
}
