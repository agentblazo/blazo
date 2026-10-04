/**
 * Detection engine — runs every deterministic rule over a run snapshot.
 *
 * @module
 */

import type { Finding } from "@blazo/types";
import { DETECTION_RULES } from "./rules";
import type { DetectionInput, FindingThresholds } from "./types";

/**
 * Apply every deterministic rule to a run snapshot.
 *
 * @remarks
 * Rules are evaluated in {@link DETECTION_RULES} order and their findings
 * concatenated. The function is pure: the same input and thresholds always
 * produce the same output.
 *
 * @param input - Current run, its spans/logs/errors, and the current time.
 * @param thresholds - Threshold values that drive the rules (see
 * `@blazo/config`).
 * @returns Zero or more findings; an empty array when nothing is flagged.
 *
 * @example
 * import { detectFindings } from "@blazo/detection";
 * import { defaultConfig } from "@blazo/config";
 *
 * const findings = detectFindings(
 *   { run, spans, logs, errors, now: Date.now() },
 *   defaultConfig.detection,
 * );
 */
export const detectFindings = (input: DetectionInput, thresholds: FindingThresholds): Finding[] => {
  const findings: Finding[] = [];
  for (const rule of DETECTION_RULES) {
    findings.push(...rule(input, thresholds));
  }
  return findings;
};
