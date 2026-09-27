/** Format a duration in milliseconds as a compact human string. */
export const formatDuration = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined) {
    return "—";
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
};

/** Format an epoch-millisecond timestamp as a UTC wall clock (`HH:mm:ss.SSS`). */
export const formatClock = (ts: number | null | undefined): string => {
  if (ts === null || ts === undefined) {
    return "—";
  }
  return new Date(ts).toISOString().slice(11, 23);
};

/** Format an epoch-millisecond timestamp as a UTC date and time. */
export const formatDateTime = (ts: number | null | undefined): string => {
  if (ts === null || ts === undefined) {
    return "—";
  }
  return `${new Date(ts).toISOString().slice(0, 10)} ${new Date(ts).toISOString().slice(11, 19)}`;
};

/** Format a token count. */
export const formatTokens = (tokens: number | null | undefined): string =>
  tokens === null || tokens === undefined ? "—" : tokens.toLocaleString("en-US");

/** Format a USD cost. */
export const formatCost = (cost: number | null | undefined): string =>
  cost === null || cost === undefined ? "—" : `$${cost.toFixed(4)}`;
