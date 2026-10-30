export const TEAMS = [
  "平台工程部",
  "算法工程部",
  "智能客服部",
  "产品部",
  "智能运维部",
  "法务合规部",
  "数据分析部",
] as const;

export type TeamName = (typeof TEAMS)[number];
