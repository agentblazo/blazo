# Blazo

> Open-source observability for AI agents.
> CLI: `blazo` · Primary command: `blazo watch` · Product: AgentBlazo · Domain: agentblazo.com

Blazo observes AI agents end-to-end and helps a developer understand what happened. It is an **observability product**, not an agent builder, playground, or evaluation platform.

```
Agent → @blazo/sdk → OpenTelemetry → Blazo Collector → SQLite → Blazo Dashboard
```

---

## The promise

> Install Blazo, run an agent, and immediately see its execution live.

```bash
blazo watch                      # start the collector + dashboard
bun examples/basic-agent/start   # run an agent
# → open http://localhost:3000 and watch the run appear live
```

---

## Features

- **Automatic instrumentation** via `observe()`, `span()` and `log()` — powered by OpenTelemetry (OTLP/HTTP, JSON).
- **Live dashboard** — runs list, run detail with a hand-built timeline + step inspector, logs, errors and findings, all updating in real time over SSE.
- **Deterministic detection** (no ML) — `long_running`, `repeated_tool`, `repeated_error`, `no_activity`, `possible_loop`.
- **CLI** — `init`, `watch` (live TUI), `runs`, `inspect`.
- **Local-first** — SQLite (WAL), no account, no cloud.

---

## Tech stack

| Layer          | Technology                        |
| -------------- | --------------------------------- |
| Monorepo       | Turborepo                         |
| Package manager| Bun                               |
| Language       | TypeScript                        |
| SDK            | TypeScript + OpenTelemetry        |
| Telemetry      | OpenTelemetry / OTLP over HTTP    |
| Collector      | Hono + Bun                        |
| API validation | Zod                               |
| Database       | SQLite (WAL mode)                 |
| ORM            | Drizzle                           |
| Dashboard      | Next.js (App Router) + Tailwind   |
| Realtime       | SSE (no Redis)                    |
| CLI            | Bun + cac                         |
| Testing        | Bun Test + Playwright             |
| Lint/format    | Biome                             |

---

## Repository layout

```
blazo/
├── apps/
│   ├── dashboard/     # Next.js (App Router) + Tailwind
│   ├── collector/     # Hono + Bun (OTLP/HTTP ingest, normalize, detect, SSE)
│   ├── cli/           # Bun + cac (init / watch / runs / inspect)
│   └── e2e/           # Playwright end-to-end tests
├── packages/
│   ├── sdk/           # @blazo/sdk   (observe / span / log)
│   ├── otel/          # @blazo/otel  (tracer/logger providers, OTLP/HTTP exporters)
│   ├── database/      # Drizzle + bun:sqlite (schema, migrations, WAL)
│   ├── detection/     # deterministic rules -> Findings
│   ├── types/         # shared domain contracts
│   ├── config/        # blazo config load/write + Zod validation
│   └── ui/            # product-specific primitives
├── examples/basic-agent/
├── docker/docker-compose.yml
├── turbo.json
├── package.json
└── biome.json
```

---

## Prerequisites

- [Bun](https://bun.sh) (managed via [mise](https://mise.jdx.dev): `.mise.toml` pins `bun = "latest"`)

```bash
mise install        # or: brew install bun / curl -fsSL https://bun.sh/install | bash
bun install
```

---

## Quick start

### 1. Instrument an agent

```ts
import { observe, span, log } from "@blazo/sdk";

await observe("research-agent", async () => {
  log("info", "agent started", { version: "0.1.0" });

  await span("llm.chat", () => callModel(prompt), { type: "llm" });
  await span("tool.search", () => search(query), { type: "tool" });
});
```

### 2. Watch it live

```bash
# from the repo root
bun apps/cli/src/index.ts watch
```

`watch` starts the collector (port 4318) and dashboard (port 3000) and shows a live TUI of runs and events. Open **http://localhost:3000** for the dashboard. Press `Ctrl+C` to stop everything.

Alternatively run each service individually:

```bash
bun apps/collector/src/index.ts        # collector on :4318
bun run dev --cwd apps/dashboard       # dashboard on :3000
```

### 3. Run an agent

```bash
bun run --cwd examples/basic-agent start
```

The run appears in the dashboard within ~2s — live, no reload.

---

## SDK (`@blazo/sdk`)

```ts
import { observe, span, log } from "@blazo/sdk";

// The root span becomes a "run"; child spans become timeline events.
await observe("agent-name", async () => {
  await span("step-name", async () => {
    log("info", "doing a thing", { model: "gpt-4o" });
  }, { type: "tool" });
}, { type: "agent" });
```

- `observe(name, fn, options?)` — wraps an agent entry point; returns `fn`'s result; marks the run `success`/`error` and records exceptions.
- `span(name, fn, options?)` — a unit of work within the run. `options.type` (`llm | tool | agent | error | session`) drives dashboard styling.
- `log(level, message, metadata?)` — a structured log line attached to the active run.

The endpoint is resolved from `BLAZO_ENDPOINT`, then `OTEL_EXPORTER_OTLP_ENDPOINT`, defaulting to `http://127.0.0.1:4318`.

---

## CLI (`blazo`)

```bash
blazo init                  # write a default blazo.config.json
blazo watch                 # start collector + dashboard, live TUI
blazo runs [--limit N]      # list recent runs
blazo inspect <run-id>      # full report: timeline, logs, errors, findings
```

Run via the source entry point during development:

```bash
bun apps/cli/src/index.ts <command>
```

Global options: `--collector <url>` to attach to a specific collector; `--json` for machine-readable output; `watch` also supports `--no-spawn-collector` and `--no-dashboard`.

---

## Dashboard

Four screens, all live-updating over SSE:

| Screen       | Route        | Contents                                                            |
| ------------ | ------------ | ------------------------------------------------------------------- |
| Overview     | `/`          | metric cards, active/slow/recent runs, findings, top errors         |
| Runs         | `/runs`      | id, agent, status, duration, tokens, cost, started                  |
| Run Detail   | `/runs/[id]` | summary, timeline, step inspection, logs, errors, findings          |
| Errors       | `/errors`    | errors grouped by signature, click-through to affected runs         |
| Logs         | `/logs`      | recent logs with a level filter                                     |
| Settings     | `/settings`  | effective local config                                              |

---

## Detection

Deterministic rules turn run data into **findings**, run on ingest and on a periodic sweep (default every 5s):

| Rule            | Trigger                          | Severity          |
| --------------- | -------------------------------- | ----------------- |
| `long_running`  | duration > threshold             | warning/critical  |
| `repeated_tool` | same tool called N times         | warning/critical  |
| `repeated_error`| same error raised N times        | critical          |
| `no_activity`   | no event for N seconds           | warning           |
| `possible_loop` | loop detection                   | critical          |

Thresholds are configured in `blazo.config.json` (see below).

---

## Configuration

`blazo init` writes a `blazo.config.json` with defaults:

```json
{
  "endpoint": "http://127.0.0.1:4318",
  "collector": { "host": "127.0.0.1", "port": 4318 },
  "dashboard": { "host": "127.0.0.1", "port": 3000 },
  "database": { "path": ".blazo/blazo.db" },
  "detection": {
    "longRunningMs": 30000,
    "repeatedToolCount": 3,
    "repeatedErrorCount": 3,
    "noActivityMs": 30000,
    "loopRepeatCount": 4
  }
}
```

---

## Collector API

| Method | Endpoint                 | Description                                   |
| ------ | ------------------------ | --------------------------------------------- |
| POST   | `/v1/traces`             | OTLP/HTTP trace ingest                        |
| POST   | `/v1/logs`               | OTLP/HTTP log ingest                          |
| GET    | `/health`                | liveness                                      |
| GET    | `/api/runs`              | recent runs                                   |
| GET    | `/api/runs/:id`          | run + spans + logs + errors + findings        |
| GET    | `/api/runs/:id/events`   | spans only                                    |
| GET    | `/api/errors`            | errors grouped by signature                   |
| GET    | `/api/logs?level=`       | recent logs, optional level filter            |
| GET    | `/api/findings`          | recent findings                               |
| GET    | `/api/overview`          | metrics + lists for the overview page         |
| GET    | `/api/config`            | effective config                              |
| GET    | `/api/stream`            | SSE: `run.started`, `span.completed`, `log.created`, `error.created`, `finding.created`, `run.completed` |

---

## Development

```bash
bun install          # install dependencies
bun run typecheck    # typecheck all packages
bun run lint         # Biome check
bun run lint:fix     # Biome check + autofix
bun run test         # Bun tests (sdk, detection, collector, database)
bun run test:e2e     # Playwright end-to-end
bun run build        # build (dashboard)
bun run db:generate  # generate Drizzle migrations
bun run db:migrate   # apply migrations
```

### End-to-end tests

The Playwright suite (`apps/e2e`) starts the collector and dashboard automatically and drives the full flow: instrument → run → run appears live → timeline → error/finding detected.

It uses an existing Chrome/Chromium binary (agent-browser's Chrome for Testing by default). To point it elsewhere:

```bash
PLAYWRIGHT_CHROME_PATH=/path/to/chrome bun run test:e2e
```

On Linux, if Chrome needs system libraries (e.g. `libnss3`), export `LD_LIBRARY_PATH` to the directory containing them before running the tests.

---

## Data model

- **Run** — `id, agent, status, started_at, ended_at, duration, tokens, cost`
- **Span** — normalized from OTLP spans: `run_id, parent_id, type, name, status, started_at, ended_at, duration, metadata`
- **Log** — `run_id, span_id, timestamp, level, message, metadata`
- **Error** — `run_id, span_id, type, message, stack, agent, timestamp`
- **Finding** — `run_id, type, severity, message, created_at`

The schema lives in `packages/database` with Drizzle migrations.

---

## Key decisions

- **OTLP/HTTP (port 4318), not gRPC** — JSON payloads parsed by the collector.
- **Bun-native everywhere except the SDK** — the SDK stays Node + Bun compatible.
- **No chart library** — the timeline is hand-built.
- **No Redis** — SSE for realtime.
- **Detection is deterministic only** — no ML/AI.

## Out of scope (by design)

No evaluations, playground, prompt management, datasets, or agent marketplace. No SaaS (billing, orgs, RBAC, SSO), no cloud, no AI/ML analysis. One integration only: the TypeScript SDK.

---

## License

Open source (see repository).
