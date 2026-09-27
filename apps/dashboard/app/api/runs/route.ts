import { collectorUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Proxy the collector runs list so the browser can fetch same-origin. */
export async function GET(request: Request): Promise<Response> {
  const limit = new URL(request.url).searchParams.get("limit") ?? "100";
  const upstream = await fetch(`${collectorUrl}/api/runs?limit=${limit}`, { cache: "no-store" });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
