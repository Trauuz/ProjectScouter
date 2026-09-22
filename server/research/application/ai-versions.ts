/**
 * Bump the matching identifier whenever prompt semantics change. These values
 * are deliberately independent of deploy-time provider model names so offline
 * evaluation reports remain comparable without reading secrets or environment.
 */
export const RESEARCH_PROMPT_VERSION = "research-safety-v1";
export const RECOMMENDATION_PROMPT_VERSION = "recommendation-safety-v1";
