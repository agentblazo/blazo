import { collectorUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Proxy the collector's SSE stream so the browser can use same-origin EventSource. */
export async function GET(): Promise<Response> {
  const upstream = await fetch(`${collectorUrl}/api/stream`, {
    headers: { accept: "text/event-stream", "cache-control": "no-cache" },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("stream unavailable", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
