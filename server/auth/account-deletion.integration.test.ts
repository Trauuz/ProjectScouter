import { describe, expect, it, vi } from "vitest";

import { createAccountDeleteHandler } from "../../app/api/account/account-deletion-handler";
import {
  requestAccountDeletion,
  type AccountDeletionJob,
  type AccountDeletionRepository,
  type AccountDeletionStep,
} from "./account-deletion-workflow";

const USER_ID = "4ba19a1f-48bc-49eb-b9cc-9af80ac03b78";

class DurableTestRepository implements AccountDeletionRepository {
  readonly requestId = "53af9f2c-e3cb-4fbe-8fe5-28de78ef04ca";
  readonly audit: Array<Record<string, string | null>> = [];
  private current: AccountDeletionJob | null = null;

  async recordRequest(userId: string): Promise<AccountDeletionJob> {
    this.current ??= {
      id: this.requestId,
      userId,
      status: "pending",
      nextStep: "revoke_access",
      attemptCount: 1,
      lastErrorCode: null,
    };
    this.audit.push({ requestId: this.requestId, event: "request_recorded" });
    return this.current;
  }

  markAccessRevoked = () => this.advance("revoke_access", "delete_authentication");
  markAuthenticationDeleted = () =>
    this.advance("delete_authentication", "delete_application_data");
  markApplicationDataDeleted = () =>
    this.advance("delete_application_data", "complete");

  async markCompleted(): Promise<AccountDeletionJob> {
    if (this.current?.nextStep === "complete") {
      this.current = { ...this.current, userId: null, status: "completed" };
      this.audit.push({ requestId: this.requestId, event: "completed" });
    }
    return this.requiredCurrent();
  }

  async markRetryableFailure(
    _requestId: string,
    failedStep: AccountDeletionStep,
    errorCode: string,
  ): Promise<AccountDeletionJob> {
    this.current = {
      ...this.requiredCurrent(),
      status: "retryable_failed",
      nextStep: failedStep,
      lastErrorCode: errorCode,
    };
    this.audit.push({
      requestId: this.requestId,
      event: "retryable_failure",
      errorCode,
    });
    return this.current;
  }

  async listRetryable(): Promise<AccountDeletionJob[]> {
    return this.current && this.current.status !== "completed" ? [this.current] : [];
  }

  async isAccessRevoked(userId: string): Promise<boolean> {
    return this.current?.userId === userId && this.current.status !== "completed";
  }

  private async advance(
    expected: AccountDeletionStep,
    next: AccountDeletionStep,
  ): Promise<AccountDeletionJob> {
    if (this.current?.nextStep === expected) {
      this.current = {
        ...this.current,
        status: "pending",
        nextStep: next,
        lastErrorCode: null,
      };
    }
    return this.requiredCurrent();
  }

  private requiredCurrent(): AccountDeletionJob {
    if (!this.current) {
      throw new Error("No deletion request");
    }
    return this.current;
  }
}

describe("account deletion request integration", () => {
  it("recovers a transient Supabase failure without deleting data early", async () => {
    const repository = new DurableTestRepository();
    const deleteAuthenticationUser = vi.fn()
      .mockRejectedValueOnce(new Error("Supabase unavailable"))
      .mockResolvedValue(undefined);
    const deleteApplicationData = vi.fn().mockResolvedValue(undefined);
    const requestDeletion = (userId: string) => requestAccountDeletion(userId, {
      repository,
      deleteAuthenticationUser,
      deleteApplicationData,
    });
    const handler = createAccountDeleteHandler({
      createRequestId: () => repository.requestId,
      getIdentity: async () => ({ id: USER_ID, email: "test@example.com", initials: "T" }),
      requestDeletion,
      reportFailure: vi.fn(),
    });

    const first = await handler(new Request("https://projectscout.test/api/account"));
    expect(first.status).toBe(202);
    expect(deleteApplicationData).not.toHaveBeenCalled();
    expect(await repository.isAccessRevoked(USER_ID)).toBe(true);

    const retry = await handler(new Request("https://projectscout.test/api/account"));
    expect(retry.status).toBe(204);
    expect(deleteApplicationData).toHaveBeenCalledOnce();
    expect(new Set(repository.audit.map((event) => event.requestId))).toEqual(
      new Set([repository.requestId]),
    );
    expect(JSON.stringify(repository.audit)).not.toContain(USER_ID);
    expect(JSON.stringify(repository.audit)).not.toContain("test@example.com");
  });
});
