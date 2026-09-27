import { RunLive } from "@/components/run-live";
import { getRun } from "@/lib/api";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getRun(id);

  if (!detail) {
    notFound();
  }

  return <RunLive initial={detail} />;
}
