import { describe, expect, it, vi } from "vitest";

import type {
  AccountDeletionJob,
  AccountDeletionRepository,
} from "./account-deletion-workflow";
import { retryAccountDeletions } from "./account-deletion-retry";

const jobs: AccountDeletionJob[] = [
  {
    id: "ef278f53-0eab-42c4-a50c-7761d9006b2d",
    userId: "4ba19a1f-48bc-49eb-b9cc-9af80ac03b78",
    status: "retryable_failed",
    nextStep: "delete_application_data",
    attemptCount: 2,
    lastErrorCode: "APPLICATION_DATA_DELETION_FAILED",
  },
];

describe("retryAccountDeletions", () => {
  it("resumes jobs whose Auth user may already be gone and returns sanitized operator status", async () => {
    const repository = {
      listRetryable: vi.fn().mockResolvedValue(jobs),
      markApplicationDataDeleted: vi.fn().mockResolvedValue({
        ...jobs[0],
        status: "pending",
        nextStep: "complete",
      }),
      markCompleted: vi.fn().mockResolvedValue({
        ...jobs[0],
        userId: null,
        status: "completed",
        nextStep: "complete",
      }),
    } as unknown as AccountDeletionRepository;
    const deleteApplicationData = vi.fn().mockResolvedValue(undefined);

    const summary = await retryAccountDeletions({
      repository,
      deleteAuthenticationUser: vi.fn(),
      deleteApplicationData,
      limit: 10,
    });

    expect(deleteApplicationData).toHaveBeenCalledWith(jobs[0].userId);
    expect(summary).toEqual({ processed: 1, completed: 1, failures: [] });
    expect(JSON.stringify(summary)).not.toContain(String(jobs[0].userId));
  });
});
