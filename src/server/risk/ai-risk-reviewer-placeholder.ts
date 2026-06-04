import type { RiskAssessmentResult, RiskReviewer } from "@/server/risk/types";

export class PlaceholderAiRiskReviewer implements RiskReviewer {
  async assess(): Promise<RiskAssessmentResult> {
    throw new Error(
      "PlaceholderAiRiskReviewer is disabled in V1. AgentGate V1 does not call paid AI APIs.",
    );
  }
}
