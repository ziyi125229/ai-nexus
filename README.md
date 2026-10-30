# 北京电子数智 · AI 平台

Enterprise AI Platform

面向「北京电子数智科技有限责任公司」产品经理（平台方向）岗位的面试演示 Demo。产品定位为企业级 AI 资产管理与开发者服务平台，用于展示信息架构与交互，不代表公司已上线的正式业务系统。

## 技术栈

- Next.js App Router + TypeScript
- Tailwind CSS
- shadcn 风格 UI（Radix 原语）
- Recharts
- React Hook Form + Zod
- localStorage + Mock Service（无真实 API Key）

## 启动

```bash
cd ai-nexus
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)（若端口占用则查看终端提示的端口，例如 3001），默认进入 `/dashboard`。

## 演示路径建议

1. 平台总览：看全局 KPI、告警和模型调用分布
2. 模型管理：发布「星河代码-V4」或注册新模型
3. Agent 管理：查看 Nova 工作流，或新建并发布 Agent
4. API 调试：发送一次 Mock 调用，再到调用日志核对
5. 告警中心 / 链路追踪：处理 DeepSeek-V4-Pro 延迟告警，查看超时 span
6. 系统设置：修改月度预算，回到成本分析查看变化

写操作会持久化到浏览器 localStorage。可在「系统设置」重置 Demo 数据。
