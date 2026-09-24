import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AccountDeletionJob,
  AccountDeletionRepository,
} from "./account-deletion-workflow";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  deleteAccountData: vi.fn(),
  deleteSupabaseAuthUser: vi.fn(),
  getAccountDeletionRepository: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./delete-account-data", () => ({
  deleteAccountData: mocks.deleteAccountData,
}));
vi.mock("./drizzle-account-deletion-repository", () => ({
  getAccountDeletionRepository: mocks.getAccountDeletionRepository,
}));
vi.mock("./supabase-admin-client", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));
vi.mock("./supabase-auth-user-deletion", () => ({
  deleteSupabaseAuthUser: mocks.deleteSupabaseAuthUser,
}));

import { requestAccountDeletion } from "./account-deletion-service";

const USER_ID = "4ba19a1f-48bc-49eb-b9cc-9af80ac03b78";
const REQUEST_ID = "53af9f2c-e3cb-4fbe-8fe5-28de78ef04ca";

function job(
  nextStep: AccountDeletionJob["nextStep"],
  status: AccountDeletionJob["status"] = "pending",
): AccountDeletionJob {
  return {
    id: REQUEST_ID,
    userId: USER_ID,
    status,
    nextStep,
    attemptCount: 1,
    lastErrorCode: null,
  };
}

function repository(): AccountDeletionRepository {
  return {
    recordRequest: vi.fn().mockResolvedValue(job("revoke_access")),
    markAccessRevoked: vi.fn().mockResolvedValue(job("delete_authentication")),
    markAuthenticationDeleted: vi.fn(),
    markApplicationDataDeleted: vi.fn(),
    markCompleted: vi.fn(),
    markRetryableFailure: vi.fn().mockResolvedValue({
      ...job("delete_authentication", "retryable_failed"),
      lastErrorCode: "AUTH_DELETION_FAILED",
    }),
    listRetryable: vi.fn().mockResolvedValue([]),
    isAccessRevoked: vi.fn().mockResolvedValue(true),
  };
}

describe("account deletion service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records the deletion before initializing the downstream Auth admin client", async () => {
    const accountDeletionRepository = repository();
    mocks.getAccountDeletionRepository.mockReturnValue(accountDeletionRepository);
    mocks.createSupabaseAdminClient.mockImplementation(() => {
      throw new Error("Supabase admin is unavailable");
    });

    const result = await requestAccountDeletion(USER_ID, REQUEST_ID);

    expect(result.status).toBe("retryable_failed");
    expect(accountDeletionRepository.recordRequest).toHaveBeenCalledWith(
      USER_ID,
      REQUEST_ID,
    );
    expect(accountDeletionRepository.markAccessRevoked).toHaveBeenCalledWith(
      REQUEST_ID,
    );
    expect(accountDeletionRepository.markRetryableFailure).toHaveBeenCalledWith(
      REQUEST_ID,
      "delete_authentication",
      "AUTH_DELETION_FAILED",
    );
  });
});
