import type { RawResearchSource } from "../server/research/domain/research-report";

export const AI_EVALUATION_METRICS = [
  "recommendationCount",
  "schemaValidity",
  "citationIds",
  "claimSupport",
  "instructionResistance",
  "weakEvidenceLabeling",
] as const;

export type AiEvaluationMetric = (typeof AI_EVALUATION_METRICS)[number];

export type EvaluationRecommendation = Readonly<{
  title: string;
  targetUser: string;
  problem: string;
  proposedSolution: string;
  mvpFeatures: string[];
  scopeEstimate: "small" | "medium" | "large";
  similarProducts: string[];
  differentiation: string;
  risks: string[];
  validationExperiment: string;
  evidenceSourceIds: string[];
  evidenceStrength: "strong" | "medium" | "weak";
  weakEvidence?: boolean;
}>;

export type EvaluationClaim = Readonly<{
  recommendationIndex: number;
  phrase: string;
  supportedBySourceIds: string[];
}>;

export type EvaluationReportCandidate = Readonly<{
  kind: "report";
  observedPrompt: string;
  recommendations: unknown;
}>;

export type EvaluationRefusalCandidate = Readonly<{
  kind: "refusal";
  code: "NO_EVIDENCE";
}>;

export type AiEvaluationCase = Readonly<{
  id: string;
  tags: readonly string[];
  prompt: string;
  summary: string;
  sources: RawResearchSource[];
  candidate: EvaluationReportCandidate | EvaluationRefusalCandidate;
  claims: EvaluationClaim[];
  expectedWeakRecommendationIndexes: number[];
  forbiddenOutputFragments: string[];
  expectedRejectedSourceUrls?: string[];
}>;

export type EvaluationVersions = Readonly<{
  dataset: string;
  prompts: Readonly<{
    research: string;
    recommendation: string;
  }>;
  models: Readonly<{
    research: string;
    recommendation: string;
  }>;
}>;

export type EvaluationCaseResult = Readonly<{
  caseId: string;
  metrics: Readonly<Record<AiEvaluationMetric, boolean>>;
  score: number;
  failures: string[];
}>;

export type EvaluationSummary = Readonly<{
  versions: EvaluationVersions;
  cases: EvaluationCaseResult[];
  metricScores: Readonly<Record<AiEvaluationMetric, number>>;
  overallScore: number;
}>;

export type EvaluationBaseline = Readonly<{
  datasetVersion: string;
  overallScore: number;
  metricScores: Readonly<Record<AiEvaluationMetric, number>>;
}>;
