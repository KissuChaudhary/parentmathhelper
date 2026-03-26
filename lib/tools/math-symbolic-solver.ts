import { buildSympyCode, type SupportedMathProblemType } from "@/lib/math/code-templates";
import {
  evaluateDeterministicReadiness,
  inferDeterministicProfile,
  inferProblemType,
  normalizeExpression,
} from "@/lib/math/sympy-utils";

export type MathProblemType = SupportedMathProblemType;

export interface MathSymbolicSolverInput {
  problem: string;
  context?: string;
}

export interface MathSymbolicSolverResult {
  problem: string;
  context?: string;
  problemType: MathProblemType;
  generatedCode: string;
  classifierConfidence: "high" | "medium" | "low";
  requiredValues: string[];
  missingValues: string[];
  deterministicPath: string;
  extractedParameters: Record<string, number | number[]>;
  parameterConfidence: Record<string, "high" | "medium" | "low">;
  ambiguitySignals: string[];
  qualityScore: number;
  qualityBreakdown: {
    completeness: number;
    parameterConfidence: number;
    ambiguityPenalty: number;
  };
  canExecuteDeterministic: boolean;
  blockingReason?: string;
  blockingRetryHint?: string;
}

export async function mathSymbolicSolverTool({
  problem,
  context,
}: MathSymbolicSolverInput): Promise<MathSymbolicSolverResult> {
  const problemType = inferProblemType(problem);
  const profile = inferDeterministicProfile(problem);
  const readiness = evaluateDeterministicReadiness(profile);
  const normalizedProblem = normalizeExpression(problem);
  return {
    problem,
    context,
    problemType,
    generatedCode: buildSympyCode(normalizedProblem, problemType),
    classifierConfidence: profile.confidence,
    requiredValues: profile.requiredValues,
    missingValues: profile.missingValues,
    deterministicPath: profile.deterministicPath,
    extractedParameters: profile.extractedParameters,
    parameterConfidence: profile.parameterConfidence,
    ambiguitySignals: profile.ambiguitySignals,
    qualityScore: profile.qualityScore,
    qualityBreakdown: profile.qualityBreakdown,
    canExecuteDeterministic: readiness.canExecute,
    blockingReason: readiness.reason,
    blockingRetryHint: readiness.retryHint,
  };
}
