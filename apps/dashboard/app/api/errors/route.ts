import { collectorUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Proxy the collector's grouped errors. */
export async function GET(request: Request): Promise<Response> {
  const limit = new URL(request.url).searchParams.get("limit") ?? "500";
  const upstream = await fetch(`${collectorUrl}/api/errors?limit=${limit}`, { cache: "no-store" });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
