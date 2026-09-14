import { describe, expect, it, vi } from "vitest";

import {
  processAccountDeletion,
  requestAccountDeletion,
  type AccountDeletionJob,
  type AccountDeletionRepository,
  type AccountDeletionStep,
} from "./account-deletion-workflow";

const USER_ID = "4ba19a1f-48bc-49eb-b9cc-9af80ac03b78";

function job(
  nextStep: AccountDeletionStep = "revoke_access",
  status: AccountDeletionJob["status"] = "pending",
): AccountDeletionJob {
  return {
    id: "ad6f69d6-578d-4b57-a90e-814a2405fb9c",
    userId: USER_ID,
    status,
    nextStep,
    attemptCount: 1,
    lastErrorCode: null,
  };
}

function repository(start = job()): AccountDeletionRepository {
  let current = start;
  const move = (nextStep: AccountDeletionStep): AccountDeletionJob => {
    current = { ...current, status: "pending", nextStep, lastErrorCode: null };
    return current;
  };

  return {
    recordRequest: vi.fn().mockResolvedValue(current),
    markAccessRevoked: vi.fn().mockImplementation(() => move("delete_authentication")),
    markAuthenticationDeleted: vi.fn().mockImplementation(() => move("delete_application_data")),
    markApplicationDataDeleted: vi.fn().mockImplementation(() => move("complete")),
    markCompleted: vi.fn().mockImplementation(() => {
      current = { ...current, userId: null, status: "completed" };
      return current;
    }),
    markRetryableFailure: vi.fn().mockImplementation(
      (_requestId, failedStep, errorCode) => {
        current = {
          ...current,
          status: "retryable_failed",
          nextStep: failedStep,
          lastErrorCode: errorCode,
        };
        return current;
      },
    ),
    listRetryable: vi.fn().mockResolvedValue([]),
    isAccessRevoked: vi.fn().mockResolvedValue(true),
  };
}

function dependencies(accountDeletionRepository = repository()) {
  return {
    repository: accountDeletionRepository,
    deleteAuthenticationUser: vi.fn().mockResolvedValue(undefined),
    deleteApplicationData: vi.fn().mockResolvedValue(undefined),
  };
}

describe("durable account deletion", () => {
  it("records the request before revoking access, deleting Auth, and deleting data", async () => {
    const repo = repository();
    const deps = dependencies(repo);

    const result = await requestAccountDeletion(USER_ID, deps);

    expect(result.status).toBe("completed");
    expect(result.userId).toBeNull();
    expect(repo.recordRequest).toHaveBeenCalledWith(USER_ID, expect.any(String));
    expect(repo.markAccessRevoked).toHaveBeenCalledOnce();
    expect(deps.deleteAuthenticationUser).toHaveBeenCalledWith(USER_ID);
    expect(repo.markAuthenticationDeleted).toHaveBeenCalledOnce();
    expect(deps.deleteApplicationData).toHaveBeenCalledWith(USER_ID);
    expect(repo.markApplicationDataDeleted).toHaveBeenCalledOnce();
    expect(repo.markCompleted).toHaveBeenCalledOnce();
    expect(vi.mocked(repo.markAccessRevoked).mock.invocationCallOrder[0]).toBeLessThan(
      deps.deleteAuthenticationUser.mock.invocationCallOrder[0],
    );
    expect(deps.deleteAuthenticationUser.mock.invocationCallOrder[0]).toBeLessThan(
      deps.deleteApplicationData.mock.invocationCallOrder[0],
    );
  });

  it("does nothing destructive when recording the durable request fails", async () => {
    const repo = repository();
    vi.mocked(repo.recordRequest).mockRejectedValue(new Error("database unavailable"));
    const deps = dependencies(repo);

    await expect(requestAccountDeletion(USER_ID, deps)).rejects.toThrow(
      "Account deletion request could not be recorded",
    );
    expect(deps.deleteAuthenticationUser).not.toHaveBeenCalled();
    expect(deps.deleteApplicationData).not.toHaveBeenCalled();
  });

  it.each([
    ["revoke_access", "ACCESS_REVOCATION_FAILED"],
    ["delete_authentication", "AUTH_DELETION_FAILED"],
    ["delete_application_data", "APPLICATION_DATA_DELETION_FAILED"],
    ["complete", "COMPLETION_RECORD_FAILED"],
  ] as const)("records a retryable operator-visible failure at %s", async (step, errorCode) => {
    const repo = repository(job(step));
    const deps = dependencies(repo);
    const failingTarget = {
      revoke_access: repo.markAccessRevoked,
      delete_authentication: deps.deleteAuthenticationUser,
      delete_application_data: deps.deleteApplicationData,
      complete: repo.markCompleted,
    }[step];
    vi.mocked(failingTarget).mockRejectedValueOnce(new Error("transient failure"));

    const result = await processAccountDeletion(job(step), deps);

    expect(result.status).toBe("retryable_failed");
    expect(result.nextStep).toBe(step);
    expect(result.lastErrorCode).toBe(errorCode);
    expect(repo.markRetryableFailure).toHaveBeenCalledWith(
      expect.any(String),
      step,
      errorCode,
    );
  });

  it("does not delete application data after a transient Supabase failure", async () => {
    const repo = repository(job("delete_authentication"));
    const deps = dependencies(repo);
    deps.deleteAuthenticationUser.mockRejectedValue(new Error("Supabase unavailable"));

    const result = await processAccountDeletion(job("delete_authentication"), deps);

    expect(result.status).toBe("retryable_failed");
    expect(deps.deleteApplicationData).not.toHaveBeenCalled();
  });

  it("returns a retryable state when recording the failure also becomes unavailable", async () => {
    const current = job("delete_authentication");
    const repo = repository(current);
    vi.mocked(repo.markRetryableFailure).mockRejectedValue(
      new Error("failure state unavailable"),
    );
    const deps = dependencies(repo);
    deps.deleteAuthenticationUser.mockRejectedValue(new Error("Supabase unavailable"));

    const result = await processAccountDeletion(current, deps);

    expect(result).toEqual({
      ...current,
      status: "retryable_failed",
      lastErrorCode: "DELETION_STATE_UNAVAILABLE",
    });
    expect(deps.deleteApplicationData).not.toHaveBeenCalled();
  });

  it("resumes from the failed step without repeating completed stages", async () => {
    const repo = repository(job("delete_application_data", "retryable_failed"));
    const deps = dependencies(repo);

    const result = await processAccountDeletion(
      job("delete_application_data", "retryable_failed"),
      deps,
    );

    expect(result.status).toBe("completed");
    expect(repo.markAccessRevoked).not.toHaveBeenCalled();
    expect(deps.deleteAuthenticationUser).not.toHaveBeenCalled();
    expect(deps.deleteApplicationData).toHaveBeenCalledOnce();
  });

  it("makes repeated requests against an already completed job harmless", async () => {
    const completed = job("complete", "completed");
    completed.userId = null;
    const repo = repository(completed);
    const deps = dependencies(repo);

    const result = await processAccountDeletion(completed, deps);

    expect(result).toEqual(completed);
    expect(deps.deleteAuthenticationUser).not.toHaveBeenCalled();
    expect(deps.deleteApplicationData).not.toHaveBeenCalled();
    expect(repo.markCompleted).not.toHaveBeenCalled();
  });
});
