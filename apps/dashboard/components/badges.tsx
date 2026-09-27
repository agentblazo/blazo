const STATUS_STYLES: Record<string, string> = {
  running: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  success: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  error: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

const TYPE_STYLES: Record<string, string> = {
  agent: "text-sky-300",
  llm: "text-violet-300",
  tool: "text-cyan-300",
  error: "text-rose-300",
  session: "text-slate-300",
};

const LEVEL_STYLES: Record<string, string> = {
  trace: "text-slate-400",
  debug: "text-slate-400",
  info: "text-sky-300",
  warn: "text-amber-300",
  error: "text-rose-300",
  fatal: "text-rose-400",
};

/** Colored pill for a run or span status. */
export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-500/15 text-slate-300 ring-slate-500/30";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {status}
    </span>
  );
}

/** Small uppercase label for a span type. */
export function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`text-[0.65rem] font-semibold uppercase tracking-wider ${TYPE_STYLES[type] ?? "text-slate-400"}`}
    >
      {type}
    </span>
  );
}

/** Color class for a log level. */
export const levelColor = (level: string): string => LEVEL_STYLES[level] ?? "text-slate-400";
