import type { Finding } from "@blazo/types";
import { DETECTION_RULES } from "./rules";
import type { DetectionInput, FindingThresholds } from "./types";

/** Apply every deterministic rule to a run snapshot. */
export const detectFindings = (input: DetectionInput, thresholds: FindingThresholds): Finding[] => {
  const findings: Finding[] = [];
  for (const rule of DETECTION_RULES) {
    findings.push(...rule(input, thresholds));
  }
  return findings;
};
