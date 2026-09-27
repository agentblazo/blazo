"use client";

import { LiveDot, useLiveResource } from "@/components/use-live-resource";
import type { BlazoConfig } from "@blazo/config";

interface ConfigResponse {
  config: BlazoConfig;
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4 border-t border-slate-800 py-2 first:border-t-0">
    <dt className="text-sm text-slate-400">{label}</dt>
    <dd className="font-mono text-sm text-slate-200">{value}</dd>
  </div>
);

/** Settings: read-only view of the effective local config. */
export function SettingsView({ initial }: { initial: BlazoConfig }) {
  const { data, connected, error } = useLiveResource<ConfigResponse>(
    { config: initial },
    "/api/config",
  );
  const config = data.config;

  if (error) {
    return (
      <section>
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <LiveDot connected={connected} />
        </div>
        <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">
          Could not reach the collector.
          <div className="mt-1 text-rose-300/80">{error}</div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <LiveDot connected={connected} />
      </div>

      <p className="mb-4 text-sm text-slate-400">
        Effective configuration read from <code className="text-slate-300">blazo.config.json</code>.
      </p>

      <div className="space-y-6">
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Connection
          </h2>
          <dl>
            <Row label="OTLP endpoint" value={config.endpoint} />
            <Row label="Collector" value={`${config.collector.host}:${config.collector.port}`} />
            <Row label="Dashboard" value={`${config.dashboard.host}:${config.dashboard.port}`} />
            <Row label="Database" value={config.database.path} />
          </dl>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Detection
          </h2>
          <dl>
            <Row label="long_running" value={`${config.detection.longRunningMs}ms`} />
            <Row label="repeated_tool" value={`${config.detection.repeatedToolCount} calls`} />
            <Row label="repeated_error" value={`${config.detection.repeatedErrorCount} errors`} />
            <Row label="no_activity" value={`${config.detection.noActivityMs}ms`} />
            <Row label="possible_loop" value={`${config.detection.loopRepeatCount} repeats`} />
          </dl>
        </div>
      </div>
    </section>
  );
}
