export type ResearchFailureCode =
  | "NO_EVIDENCE"
  | "UPSTREAM_FAILED"
  | "UPSTREAM_TIMEOUT"
  | "SERVER_MISCONFIGURED";

export class ResearchFailure extends Error {
  constructor(
    readonly code: ResearchFailureCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ResearchFailure";
  }
}
