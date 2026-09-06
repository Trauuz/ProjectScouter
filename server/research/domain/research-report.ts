export type EvidenceStrength = "strong" | "medium" | "weak";
export type ScopeEstimate = "small" | "medium" | "large";

export type RawResearchSource = {
  title: string;
  url: string;
  snippet: string;
  publishedAt: string | null;
};

export type ResearchSource = RawResearchSource & {
  id: string;
};

export type ResearchBundle = {
  summary: string;
  sources: ResearchSource[];
};

export type ProjectRecommendation = {
  title: string;
  targetUser: string;
  problem: string;
  proposedSolution: string;
  mvpFeatures: string[];
  scopeEstimate: ScopeEstimate;
  similarProducts: string[];
  differentiation: string;
  risks: string[];
  validationExperiment: string;
  evidenceSourceIds: string[];
  evidenceStrength: EvidenceStrength;
  weakEvidence: boolean;
};

export type ResearchReport = {
  prompt: string;
  summary: string;
  generatedAt: string;
  sources: ResearchSource[];
  recommendations: ProjectRecommendation[];
};

export type ResearchResponse = {
  report: ResearchReport;
  persistence: ResearchPersistenceStatus;
};

export type ResearchPersistenceStatus =
  | { status: "saved"; runId: string }
  | { status: "failed" };

export type ResearchApiErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_CONTENT_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "INVALID_PROMPT"
  | "FORBIDDEN_ORIGIN"
  | "RATE_LIMITED"
  | "MONTHLY_USAGE_EXCEEDED"
  | "FREE_TIER_CAPACITY_REACHED"
  | "USAGE_UNAVAILABLE"
  | "NO_EVIDENCE"
  | "UPSTREAM_FAILED"
  | "UPSTREAM_TIMEOUT"
  | "SERVER_MISCONFIGURED";

export type ResearchErrorResponse = {
  error: {
    code: ResearchApiErrorCode;
    message: string;
    retryable: boolean;
    details?: string;
  };
};
