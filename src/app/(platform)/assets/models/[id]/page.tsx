import { ModelDetailPage } from "@/features/models/model-detail-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ModelDetailPage id={id} />;
}
