import { RunDetailView } from "@/components/run-detail-view";
import { getRun } from "@/lib/api";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getRun(id);

  if (!detail) {
    notFound();
  }

  return <RunDetailView detail={detail} />;
}
