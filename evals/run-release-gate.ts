import { readFile } from "node:fs/promises";

import { ADVERSARIAL_EVALUATION_CASES } from "./fixtures/adversarial-cases";
import {
  assertReleaseThreshold,
  evaluateDataset,
} from "./lib/evaluate-dataset";
import type { EvaluationBaseline } from "./types";
import { AI_EVALUATION_VERSIONS } from "./versions";

async function main(): Promise<void> {
  const baseline = JSON.parse(
    await readFile(
      new URL(
        `./baselines/${AI_EVALUATION_VERSIONS.dataset}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as EvaluationBaseline;

  const result = evaluateDataset(
    ADVERSARIAL_EVALUATION_CASES,
    AI_EVALUATION_VERSIONS,
  );

  assertReleaseThreshold(result, baseline);

  process.stdout.write(
    `${JSON.stringify({ event: "ai_evaluation_passed", ...result })}\n`,
  );
}

void main();
