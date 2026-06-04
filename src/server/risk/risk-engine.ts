import type {
  RiskAssessmentInput,
  RiskAssessmentResult,
  RiskReviewer,
} from "@/server/risk/types";
import { RulesBasedRiskReviewer } from "@/server/risk/rules-based-risk-reviewer";

export class RiskEngine {
  constructor(private readonly reviewer: RiskReviewer = new RulesBasedRiskReviewer()) {}

  assess(input: RiskAssessmentInput): Promise<RiskAssessmentResult> {
    return this.reviewer.assess(input);
  }
}

export const localRiskEngine = new RiskEngine();
