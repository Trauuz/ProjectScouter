import {
  processAccountDeletion,
  type AccountDeletionDependencies,
  type AccountDeletionStep,
} from "./account-deletion-workflow";

export type AccountDeletionRetrySummary = {
  processed: number;
  completed: number;
  failures: Array<{
    requestId: string;
    step: AccountDeletionStep;
    errorCode: string;
  }>;
};

export async function retryAccountDeletions({
  repository,
  deleteAuthenticationUser,
  deleteApplicationData,
  limit,
}: AccountDeletionDependencies & { limit: number }): Promise<AccountDeletionRetrySummary> {
  const jobs = await repository.listRetryable(limit);
  const summary: AccountDeletionRetrySummary = {
    processed: jobs.length,
    completed: 0,
    failures: [],
  };

  for (const job of jobs) {
    try {
      const result = await processAccountDeletion(job, {
        repository,
        deleteAuthenticationUser,
        deleteApplicationData,
      });
      if (result.status === "completed") {
        summary.completed += 1;
        continue;
      }
      summary.failures.push({
        requestId: result.id,
        step: result.nextStep,
        errorCode: result.lastErrorCode ?? "DELETION_RETRY_FAILED",
      });
    } catch {
      summary.failures.push({
        requestId: job.id,
        step: job.nextStep,
        errorCode: "DELETION_STATE_UNAVAILABLE",
      });
    }
  }

  return summary;
}
