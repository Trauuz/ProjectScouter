import { logger } from "../observability/structured-logger";

export type AccountDeletionStatus =
  | "pending"
  | "retryable_failed"
  | "completed";

export type AccountDeletionStep =
  | "revoke_access"
  | "delete_authentication"
  | "delete_application_data"
  | "complete";

export type AccountDeletionJob = {
  id: string;
  userId: string | null;
  status: AccountDeletionStatus;
  nextStep: AccountDeletionStep;
  attemptCount: number;
  lastErrorCode: string | null;
};

export interface AccountDeletionRepository {
  recordRequest(userId: string, requestId: string): Promise<AccountDeletionJob>;
  markAccessRevoked(requestId: string): Promise<AccountDeletionJob>;
  markAuthenticationDeleted(requestId: string): Promise<AccountDeletionJob>;
  markApplicationDataDeleted(requestId: string): Promise<AccountDeletionJob>;
  markCompleted(requestId: string): Promise<AccountDeletionJob>;
  markRetryableFailure(
    requestId: string,
    failedStep: AccountDeletionStep,
    errorCode: string,
  ): Promise<AccountDeletionJob>;
  listRetryable(limit: number): Promise<AccountDeletionJob[]>;
  isAccessRevoked(userId: string): Promise<boolean>;
}

export type AccountDeletionDependencies = {
  repository: AccountDeletionRepository;
  deleteAuthenticationUser(userId: string): Promise<void>;
  deleteApplicationData(userId: string): Promise<void>;
};

const ERROR_CODES: Record<AccountDeletionStep, string> = {
  revoke_access: "ACCESS_REVOCATION_FAILED",
  delete_authentication: "AUTH_DELETION_FAILED",
  delete_application_data: "APPLICATION_DATA_DELETION_FAILED",
  complete: "COMPLETION_RECORD_FAILED",
};

export class AccountDeletionRequestError extends Error {
  constructor(options?: ErrorOptions) {
    super("Account deletion request could not be recorded.", options);
    this.name = "AccountDeletionRequestError";
  }
}

async function runCurrentStep(
  job: AccountDeletionJob,
  dependencies: AccountDeletionDependencies,
): Promise<AccountDeletionJob> {
  const { repository } = dependencies;

  if (job.nextStep === "revoke_access") {
    return repository.markAccessRevoked(job.id);
  }

  if (!job.userId) {
    throw new Error("Deletion job has no retryable account subject.");
  }

  if (job.nextStep === "delete_authentication") {
    await dependencies.deleteAuthenticationUser(job.userId);
    return repository.markAuthenticationDeleted(job.id);
  }

  if (job.nextStep === "delete_application_data") {
    await dependencies.deleteApplicationData(job.userId);
    return repository.markApplicationDataDeleted(job.id);
  }

  return repository.markCompleted(job.id);
}

export async function processAccountDeletion(
  initialJob: AccountDeletionJob,
  dependencies: AccountDeletionDependencies,
): Promise<AccountDeletionJob> {
  let job = initialJob;

  while (job.status !== "completed") {
    const failedStep = job.nextStep;
    try {
      job = await runCurrentStep(job, dependencies);
    } catch (reason) {
      logger.error("account_deletion.step.failed", {
        operation: failedStep,
        userId: job.userId,
        errorCategory: "deletion_failure",
        retryStatus: "retryable",
      }, reason);
      logger.metric("deletion.failure.count", {
        value: 1,
        operation: failedStep,
      });
      try {
        return await dependencies.repository.markRetryableFailure(
          job.id,
          failedStep,
          ERROR_CODES[failedStep],
        );
      } catch (stateReason) {
        logger.error("account_deletion.state_record.failed", {
          operation: failedStep,
          userId: job.userId,
          errorCategory: "database_error",
          retryStatus: "retryable",
        }, stateReason);
        logger.metric("deletion.failure.count", { value: 1, operation: failedStep });
        return {
          ...job,
          status: "retryable_failed",
          lastErrorCode: "DELETION_STATE_UNAVAILABLE",
        };
      }
    }
  }

  return job;
}

export async function requestAccountDeletion(
  userId: string,
  dependencies: AccountDeletionDependencies,
  requestId = crypto.randomUUID(),
): Promise<AccountDeletionJob> {
  let job: AccountDeletionJob;
  try {
    job = await dependencies.repository.recordRequest(userId, requestId);
  } catch (cause) {
    throw new AccountDeletionRequestError({ cause });
  }

  return processAccountDeletion(job, dependencies);
}
