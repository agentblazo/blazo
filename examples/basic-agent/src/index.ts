import { log, observe, shutdown, span } from "@blazo/sdk";

/** Sleep helper so the fake agent has a realistic timeline. */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Fake LLM call that emits an `llm` span. */
const callLlm = (prompt: string, tokens: number): Promise<string> =>
  span(
    "llm.chat",
    async () => {
      log("debug", "sending prompt", { prompt });
      await sleep(400);
      return `completion for: ${prompt}`;
    },
    {
      type: "llm",
      attributes: {
        "gen_ai.system": "openai",
        "gen_ai.request.model": "gpt-4o",
        "gen_ai.usage.total_tokens": tokens,
      },
    },
  );

/** Fake tool call that emits a `tool` span. */
const search = (query: string): Promise<string[]> =>
  span(
    "tool.search",
    async () => {
      await sleep(250);
      return [`result for ${query}`, `another result for ${query}`];
    },
    { type: "tool", attributes: { "tool.name": "search", "tool.input.query": query } },
  );

/** Fake tool that always fails, producing an error span and exception event. */
const fetchPage = (url: string): Promise<string> =>
  span(
    "tool.fetch",
    async () => {
      await sleep(150);
      throw new Error("upstream 503: service unavailable");
    },
    { type: "tool", attributes: { "tool.name": "fetch", "tool.input.url": url } },
  );

const main = async (): Promise<void> => {
  await observe(
    "research-agent",
    async () => {
      log("info", "agent started", { version: "0.1.0" });

      const plan = await callLlm("Plan the research task", 128);
      log("info", "plan ready", { plan });

      const results = await search("blazo observability");
      log("info", "search finished", { count: results.length });

      for (let attempt = 1; attempt <= 4; attempt += 1) {
        try {
          await fetchPage(`https://example.com?attempt=${attempt}`);
        } catch (error) {
          log("error", `tool call failed (attempt ${attempt}), continuing`, {
            error: String(error),
          });
        }
      }

      const summary = await callLlm("Summarize the results", 256);
      log("info", "agent finished", { summary });

      return summary;
    },
    { attributes: { "blazo.tokens": 384, "blazo.cost": 0.0021 } },
  );
};

await main();
await shutdown();
console.log("basic-agent run exported to Blazo");
