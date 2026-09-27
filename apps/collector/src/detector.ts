import { type FindingThresholds, detectFindings } from "@blazo/detection";
import type { Repository } from "./repository";

/** Runs deterministic detection for individual runs and as a periodic sweep. */
export interface Detector {
  runFor: (runId: string) => void;
  sweep: () => void;
}

/** Create a detector backed by the repository and thresholds. */
export const createDetector = (repository: Repository, thresholds: FindingThresholds): Detector => {
  const runFor = (runId: string): void => {
    const snapshot = repository.getRunSnapshot(runId);
    if (!snapshot) {
      return;
    }
    const findings = detectFindings({ ...snapshot, now: Date.now() }, thresholds);
    for (const finding of findings) {
      repository.saveFinding(finding);
    }
  };

  const sweep = (): void => {
    for (const run of repository.listRunningRuns()) {
      runFor(run.id);
    }
  };

  return { runFor, sweep };
};
