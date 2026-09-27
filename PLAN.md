# Blazo — MVP Build Plan

> **Open-source observability for AI agents.**
> CLI: `blazo` · Primary command: `blazo watch` · Product: AgentBlazo · Domain: agentblazo.com

Blazo observes AI agents end-to-end and helps a developer understand what happened. It is an **observability product**, not an agent builder, playground, or evaluation platform.

---

## MVP Promise

> **Install Blazo, run an agent, and immediately see its execution live.**

```
Agent → @blazo/sdk → OpenTelemetry → Blazo Collector → SQLite → Blazo Dashboard
```

---

## Tech Stack

| Layer            | Technology                        |
| ---------------- | --------------------------------- |
| Monorepo         | Turborepo                         |
| Package manager  | Bun                               |
| Runtime          | Bun (SDK stays Node + Bun compat) |
| Language         | TypeScript                        |
| SDK              | TypeScript + OpenTelemetry        |
| Telemetry        | OpenTelemetry / OTLP              |
| Collector        | Hono + Bun                        |
| API validation   | Zod                               |
| Database         | SQLite (WAL mode)                 |
| ORM              | Drizzle                           |
| Dashboard        | Next.js (App Router)              |
| UI               | Tailwind + shadcn/ui              |
| Realtime         | SSE (no Redis)                    |
| CLI              | Bun + cac                         |
| Testing          | Bun Test + Playwright             |
| Lint/format      | Biome                             |
| Containerization | Docker                            |
| Cloud later      | AWS ECS/Fargate + PostgreSQL + S3 |

---

## Monorepo Layout

```
blazo/
├── apps/
│   ├── dashboard/      # Next.js (App Router) + Tailwind + shadcn/ui
│   ├── collector/      # Hono + Bun (OTLP/HTTP ingest, normalize, detect, SSE)
│   └── cli/            # Bun + cac (init/watch/runs/inspect)
├── packages/
│   ├── sdk/            # @blazo/sdk  (observe / span / log)
│   ├── otel/           # @blazo/otel (tracer/logger provider, OTLP HTTP exporter)
│   ├── database/       # Drizzle + bun:sqlite (schema, migrations, WAL)
│   ├── detection/      # deterministic rules -> Findings
│   ├── types/          # shared domain contracts
│   ├── config/         # blazo config load/write + Zod validation
│   └── ui/             # product-specific primitives
├── examples/basic-agent/
├── docker/docker-compose.yml
├── turbo.json
├── package.json
├── tsconfig.json
├── biome.json
├── .mise.toml
└── PLAN.md
```

---

## Data Model

- **Run** — `id, agent, status(running|success|error), started_at, ended_at, duration, tokens, cost`
- **Span/Event** — normalized from OTLP spans: `run_id, parent_id, type(llm|tool|agent|error|session), name, status, started_at, ended_at, duration, metadata(json)`
- **Log** — `run_id, span_id, timestamp, level, message, metadata(json)`
- **Error** — `run_id, span_id, type, message, stack, agent, timestamp`
- **Finding** — `run_id, type(long_running|repeated_tool|repeated_error|no_activity|possible_loop), severity, message, created_at`

Schema lives in `packages/database` with Drizzle migrations.

---

## Telemetry Pipeline (OTLP/HTTP, port 4318)

```
@blazo/sdk → @blazo/otel (span/log → OTLP/HTTP JSON exporter) → collector /v1/traces (Hono)
  → decode ExportTraceServiceRequest (@opentelemetry/otlp-transformer)
  → normalize spans → Run/Span/Log rows → SQLite
  → detection rules → Findings → SSE push
```

- Root span from `observe(name, fn)` becomes the **Run**; child spans become **events** (`blazo.type`, `blazo.status` attributes drive typing).
- Collector normalizes on ingest; `GET /api/runs`, `/api/runs/:id`, `/api/runs/:id/events` serve the dashboard.
- **SSE**: `GET /api/stream` pushes `run.started / span.completed / log.created / error.created / finding.created / run.completed`.

---

## MVP Feature Surface

### SDK
```ts
import { observe } from "@blazo/sdk"
await observe("research-agent", async () => { await agent.run() })
```
Start with `observe()`, `span()`, `log()` only.

### CLI
```bash
blazo init
blazo watch
blazo runs
blazo inspect <run-id>
```

### Dashboard (4 screens)
1. Overview (active runs, recent runs, errors, slow runs, finding banners)
2. Runs (id, agent, status, duration, tokens, started)
3. Run Detail (summary, timeline, logs, step inspection, metadata) — the hero screen
4. Settings (local config)

### Detection (deterministic only, no ML)
- `long_running` — duration > threshold
- `repeated_tool` — same tool called N times
- `repeated_error` — same error N times
- `no_activity` — no event for N seconds
- `possible_loop` — loop detection

---

## Execution Sequence

### Milestone 0 — Scaffold
1. Add `bun = "latest"` to mise config + install.
2. Create monorepo: `turbo.json`, workspaces, base `tsconfig`, `biome.json`, `docker-compose.yml`, git init.
3. `packages/types` (domain contracts), `packages/config` (Zod schema + defaults).
4. `packages/database` (Drizzle schema + migration), `packages/ui` empty.

### Milestone 1 — Vertical slice (the "banger")
5. `packages/otel` — OTel setup: tracer/logger provider, resource attrs, OTLP/HTTP exporter.
6. `packages/sdk` — `observe()`, `span()`, `log()`.
7. `apps/collector` — Hono OTLP/HTTP ingest → normalize → SQLite; `/api/runs*` + `/health`.
8. `apps/dashboard` — Runs list + Run Detail timeline (hand-built) + step inspection.
9. `examples/basic-agent` — fake agent emitting llm/tool spans + logs/errors.
10. **Verify**: run agent → run appears in dashboard with timeline.

### Milestone 2 — Live + CLI
11. SSE streaming → live timeline + run status in dashboard.
12. `apps/cli` — `init`, `watch` (starts collector+dashboard, live TUI), `runs`, `inspect`.

### Milestone 3 — Detection + Errors + Logs
13. `packages/detection` — 5 deterministic rules → Findings (run on ingest/timer, surfaced via SSE).
14. Errors view (grouped, click-through) + Logs view (level filter).
15. Findings surfaced in dashboard + CLI.

### Milestone 4 — Metrics, Overview, Tests, Polish
16. Overview page.
17. Metrics aggregation (runs, success/error rate, duration, LLM/tool calls, tokens, cost).
18. Settings page; Bun tests for SDK/detection/collector/DB.
19. Playwright E2E: instrument → run → telemetry received → run appears → timeline updates → error/finding detected.

---

## Key Decisions

- **OTLP/HTTP (4318), not gRPC** — decode with `@opentelemetry/otlp-transformer`; gRPC is post-MVP.
- **Bun native everywhere except SDK** — SDK stays Node+Bun compatible.
- **No chart library** — hand-build the timeline for full control of Blazo's identity.
- **No Redis** — SSE for realtime.
- **Detection is deterministic only** — no ML/AI.

---

## Definition of Done

A developer installs `@blazo/sdk`, runs `blazo watch`, executes a TypeScript agent, sees the live run + timeline + logs + errors, and gets a deterministic "possibly stuck" warning — all locally, no account.

---

## Explicitly OUT of MVP

- No evaluations, playground, prompt management, datasets, agent marketplace
- No SaaS (billing, orgs, teams, RBAC, SSO)
- No Cloud (Postgres/Redis/S3/ECS in production)
- No AI-powered analysis, no ML anomaly detection
- One integration only: TypeScript SDK

---

## Post-MVP Progression

```
MVP → Claude Code / MCP / CrewAI → Anomalies / Alerts / Agent Health → Python SDK → Cloud / AWS
```
