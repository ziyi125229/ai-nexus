import { LogsPage } from "@/features/logs/logs-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ requestId?: string; appId?: string }>;
}) {
  const params = await searchParams;
  return <LogsPage initialSearch={params.requestId} initialAppId={params.appId} />;
}
