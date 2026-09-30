# Blazo — Documentation Site Plan

> Build a docs site covering every package, SDK, app, and how things work — diagrams + text.
> Stack: **Fumadocs** · location: **`apps/docs`** in this monorepo · API ref: **TypeDoc** · diagrams: **Mermaid**.

## Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Framework | Fumadocs | Next.js App Router-native; matches the existing Turborepo + Bun + TypeScript + Tailwind stack; built-in search, MDX, Mermaid, auto API reference |
| Location | `apps/docs` in this monorepo | Shares tooling (Next 16 / React 19 / Tailwind 4), versioned with code, wired into `turbo.json` |
| API reference | TypeDoc auto + hand-written guides | Auto-generate per-package API from JSDoc; write conceptual guides by hand |
| Diagrams | Mermaid (in MDX) | Text-based, version-controlled, rendered by Fumadocs |

## Stack

- `fumadocs-core`, `fumadocs-ui`, `fumadocs-mdx`
- `next` (reuses the version from `apps/dashboard`)
- Tailwind 4, Biome (lint/format), Turborepo
- `typedoc` + markdown plugin for API reference

## Phase 0 — Scaffold

- `apps/docs` workspace with Fumadocs.
- Add `typecheck` + `build` (`.next/**`) to `turbo.json` (already supports both).
- Layout:
  - `content/` for MDX
  - `lib/source.ts` for the Fumadocs source map
  - `app/(home)/` + `app/docs/[[...slug]]`

## Phase 1 — Information architecture

```
Getting started  · install, quick start, blazo watch
Concepts         · Run / Span / Log / Error / Finding model
Architecture     · pipeline, data flow, ports (4318 / 3000)
SDK              · @blazo/sdk   (observe / span / log guide)
OTel             · @blazo/otel  (provider + OTLP/HTTP exporter)
Collector        · apps/collector (ingest, normalize, detect, SSE + API table)
Database         · packages/database (Drizzle schema, migrations, WAL)
Detection        · packages/detection (5 rules -> Findings)
Config           · packages/config (Zod schema + defaults)
Types            · packages/types (shared contracts)
UI               · packages/ui
CLI              · apps/cli (init / watch / runs / inspect)
Dashboard        · apps/dashboard (screens + routes)
Examples         · basic-agent
API Reference    · TypeDoc-generated (sdk, otel, types, config, detection)
Self-hosting     · Docker, deploy options
```

## Phase 2 — Diagrams (Mermaid, in MDX)

1. **Architecture** — `Agent -> @blazo/sdk -> OTel -> Collector -> SQLite -> Dashboard`
2. **Sequence** — `observe()` -> span/log -> OTLP/HTTP `/v1/traces` -> normalize -> detect -> SSE push -> dashboard update
3. **ER diagram** — Run, Span, Log, Error, Finding (+ foreign keys)

## Phase 3 — Hand-written content

- Reuse + expand the README: quick start, SDK examples, collector endpoint table, SSE event schema, detection rules table, config JSON, data model, key decisions.

## Phase 4 — Auto API reference

- `typedoc` + markdown plugin per package, wired into the docs build to regenerate from JSDoc on change.

## Phase 5 — Search, polish, deploy

- Fumadocs built-in search (Orama), nav/sidebar, `llms.txt` export, `bun run build` in CI, deploy via Vercel / GH Pages / self-host.

## Open follow-ups (decide before build)

1. **JSDoc coverage** — SDK/otel/types currently have minimal JSDoc; TypeDoc output stays thin until annotated. Budget a JSDoc pass.
2. **Package aliases** — docs import from `@blazo/sdk` etc.; confirm `workspace:*` linkage works for the docs build.
3. **Homepage** — docs-only, or a small marketing landing page (`/`) alongside `/docs`?
