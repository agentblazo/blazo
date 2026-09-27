import { collectorUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Proxy the collector's effective config. */
export async function GET(): Promise<Response> {
  const upstream = await fetch(`${collectorUrl}/api/config`, { cache: "no-store" });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
