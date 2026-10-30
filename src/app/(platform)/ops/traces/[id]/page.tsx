import { TraceDetailPage } from "@/features/traces/trace-detail-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TraceDetailPage id={id} />;
}
