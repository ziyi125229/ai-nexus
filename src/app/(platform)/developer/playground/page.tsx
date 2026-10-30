import { PlaygroundPage } from "@/features/playground/playground-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ appId?: string; agentId?: string }>;
}) {
  const params = await searchParams;
  return <PlaygroundPage initialAppId={params.appId} initialAgentId={params.agentId} />;
}
