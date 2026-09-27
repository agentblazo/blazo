import { collectorUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Proxy a single run's detail so the browser can fetch same-origin. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const upstream = await fetch(`${collectorUrl}/api/runs/${id}`, { cache: "no-store" });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
