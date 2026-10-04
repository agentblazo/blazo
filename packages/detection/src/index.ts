/**
 * Deterministic detection rules that turn runs into findings.
 *
 * Rules are pure functions over a run snapshot and a set of thresholds. They
 * are evaluated on ingest and on a periodic sweep; no ML or AI is involved.
 *
 * @packageDocumentation
 */

export { detectFindings } from "./detect";
export {
  DETECTION_RULES,
  longRunningRule,
  noActivityRule,
  possibleLoopRule,
  repeatedErrorRule,
  repeatedToolRule,
} from "./rules";
export type { DetectionRule } from "./rules";
export type { DetectionInput, FindingThresholds } from "./types";
