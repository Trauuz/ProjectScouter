import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkDatabaseConnection: vi.fn(),
  validateProductionEnvironment: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/config/production-environment", () => ({
  validateProductionEnvironment: mocks.validateProductionEnvironment,
}));
vi.mock("@/server/database/client", () => ({
  checkDatabaseConnection: mocks.checkDatabaseConnection,
}));

import { projectScoutReadinessChecks } from "./readiness-checks";

describe("ProjectScout readiness checks", () => {
  beforeEach(() => {
    mocks.checkDatabaseConnection.mockReset().mockResolvedValue(undefined);
    mocks.validateProductionEnvironment.mockReset();
  });

  it("validates local configuration and performs one read-only database query", async () => {
    const externalRequest = vi.spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("External health calls are forbidden."));
    const checks = projectScoutReadinessChecks();
    const signal = new AbortController().signal;

    await Promise.all(checks.map((check) => check.run(signal)));

    expect(checks.map((check) => check.name)).toEqual([
      "configuration",
      "database",
    ]);
    expect(mocks.validateProductionEnvironment).toHaveBeenCalledOnce();
    expect(mocks.checkDatabaseConnection).toHaveBeenCalledOnce();
    expect(mocks.checkDatabaseConnection).toHaveBeenCalledWith(
      signal,
    );
    expect(externalRequest).not.toHaveBeenCalled();
    externalRequest.mockRestore();
  });
});
