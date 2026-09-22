import type {
  MeteredRecommendationProvider,
  MeteredResearchProvider,
  RecommendationProvider,
  ResearchProvider,
} from "../../research/application/research-ports";
import { RecordProviderCall } from "./record-provider-call";

export function ledgerResearchProvider(
  provider: MeteredResearchProvider,
  recorder: RecordProviderCall,
): ResearchProvider {
  return {
    research: (prompt, signal, context) =>
      recorder.run(context, () => provider.research(prompt, signal)),
  };
}

export function ledgerRecommendationProvider(
  provider: MeteredRecommendationProvider,
  recorder: RecordProviderCall,
): RecommendationProvider {
  return {
    generate: (prompt, research, signal, context) =>
      recorder.run(
        context,
        () => provider.generate(prompt, research, signal),
      ),
  };
}
