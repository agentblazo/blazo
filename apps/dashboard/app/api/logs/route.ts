import { collectorUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Proxy the collector's logs, forwarding the level filter. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const level = url.searchParams.get("level");
  const limit = url.searchParams.get("limit") ?? "200";
  const query = level ? `level=${encodeURIComponent(level)}&limit=${limit}` : `limit=${limit}`;
  const upstream = await fetch(`${collectorUrl}/api/logs?${query}`, { cache: "no-store" });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
