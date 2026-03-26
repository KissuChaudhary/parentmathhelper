import type { SupportedMathProblemType } from "./code-templates";
import {
  extractArithmeticDeterministic,
  extractGeometryDeterministic,
  extractProbabilityDeterministic,
  extractStatisticsDeterministic,
} from "./deterministic-extractors";

export function normalizeExpression(input: string) {
  return input.replace(/\^/g, "**");
}

export type ClassifierConfidence = "high" | "medium" | "low";

export type DeterministicProfile = {
  problemType: SupportedMathProblemType;
  confidence: ClassifierConfidence;
  requiredValues: string[];
  missingValues: string[];
  deterministicPath: string;
  extractedParameters: Record<string, number | number[]>;
  parameterConfidence: Record<string, ClassifierConfidence>;
  ambiguitySignals: string[];
  qualityScore: number;
  qualityBreakdown: {
    completeness: number;
    parameterConfidence: number;
    ambiguityPenalty: number;
  };
};

export type DeterministicReadiness = {
  canExecute: boolean;
  reason?: string;
  retryHint?: string;
};

function scoreProfile(
  requiredValues: string[],
  missingValues: string[],
  parameterConfidence: Record<string, ClassifierConfidence>,
  ambiguitySignals: string[]
) {
  const totalRequired = requiredValues.length || 1;
  const presentCount = Math.max(0, requiredValues.length - missingValues.length);
  const completeness = Math.round((presentCount / totalRequired) * 100);

  const confidenceWeights = Object.values(parameterConfidence).map((value) =>
    value === "high" ? 100 : value === "medium" ? 70 : 40
  );
  const parameterConfidenceScore =
    confidenceWeights.length > 0
      ? Math.round(confidenceWeights.reduce((acc, item) => acc + item, 0) / confidenceWeights.length)
      : requiredValues.length === 0
        ? 100
        : 0;

  const ambiguityPenalty = Math.min(40, ambiguitySignals.length * 15);
  const qualityScore = Math.max(
    0,
    Math.min(100, Math.round(completeness * 0.6 + parameterConfidenceScore * 0.4 - ambiguityPenalty))
  );

  return {
    qualityScore,
    qualityBreakdown: {
      completeness,
      parameterConfidence: parameterConfidenceScore,
      ambiguityPenalty,
    },
  };
}

export function inferProblemType(problem: string): SupportedMathProblemType {
  const text = problem.toLowerCase();

  if (text.includes("derivative") || text.includes("differentiate") || text.includes("d/dx")) {
    return "calculus_derivative";
  }
  if (text.includes("integral") || text.includes("integrate") || text.includes("∫")) {
    return "calculus_integral";
  }
  if (text.includes("limit") || text.includes("lim")) {
    return "calculus_limit";
  }
  if (text.includes("sin") || text.includes("cos") || text.includes("tan")) {
    return "trigonometry";
  }
  if (text.includes("dy/dx") || text.includes("ode") || text.includes("differential equation")) {
    return "differential_equation";
  }
  if (text.includes("matrix") || text.includes("determinant") || text.includes("eigen")) {
    return "linear_algebra";
  }
  if (
    /(probability|chance|odds|permutation|combination|binomial|distribution|random variable|expected value)/.test(
      text
    )
  ) {
    return "probability";
  }
  if (
    /(mean|median|mode|variance|standard deviation|std dev|statistics|regression|correlation|dataset|sample)/.test(
      text
    )
  ) {
    return "statistics";
  }
  if (
    /(geometry|circle|triangle|rectangle|square|chord|radius|diameter|hypotenuse|polygon|cylinder|cone|sphere)/.test(
      text
    )
  ) {
    return "geometry";
  }
  if (/\b[a-z]\b|[a-z]\d+|\d+[a-z]/i.test(text) && /[+\-*/^()=]/.test(text)) {
    return "algebra";
  }
  if (
    /^\s*[-+/*().\d\s^]+\s*$/.test(text) ||
    (/(what is|calculate|compute|evaluate)/.test(text) &&
      /\d/.test(text) &&
      !(/\b[a-z]\b|[a-z]\d+|\d+[a-z]/i.test(text)))
  ) {
    return "arithmetic";
  }
  if (text.includes("=") || text.includes("solve") || text.includes("factor")) {
    return "algebra";
  }
  return "general_symbolic";
}

export function inferDeterministicProfile(problem: string): DeterministicProfile {
  const text = problem.toLowerCase();
  const problemType = inferProblemType(problem);
  const defaultProfile: DeterministicProfile = {
    problemType,
    confidence: "medium",
    requiredValues: [],
    missingValues: [],
    deterministicPath: "sympy_general",
    extractedParameters: {},
    parameterConfidence: {},
    ambiguitySignals: [],
    qualityScore: 70,
    qualityBreakdown: {
      completeness: 100,
      parameterConfidence: 70,
      ambiguityPenalty: 0,
    },
  };

  if (problemType === "geometry") {
    const extraction = extractGeometryDeterministic(text);
    return {
      ...scoreProfile(
        extraction.requiredValues,
        extraction.missingValues,
        extraction.parameterConfidence,
        extraction.ambiguitySignals
      ),
      ...defaultProfile,
      confidence: extraction.confidence,
      requiredValues: extraction.requiredValues,
      missingValues: extraction.missingValues,
      deterministicPath: extraction.deterministicPath,
      extractedParameters: extraction.extractedParameters,
      parameterConfidence: extraction.parameterConfidence,
      ambiguitySignals: extraction.ambiguitySignals,
    };
  }

  if (problemType === "probability") {
    const extraction = extractProbabilityDeterministic(text);
    return {
      ...scoreProfile(
        extraction.requiredValues,
        extraction.missingValues,
        extraction.parameterConfidence,
        extraction.ambiguitySignals
      ),
      ...defaultProfile,
      confidence: extraction.confidence,
      requiredValues: extraction.requiredValues,
      missingValues: extraction.missingValues,
      deterministicPath: extraction.deterministicPath,
      extractedParameters: extraction.extractedParameters,
      parameterConfidence: extraction.parameterConfidence,
      ambiguitySignals: extraction.ambiguitySignals,
    };
  }

  if (problemType === "statistics") {
    const extraction = extractStatisticsDeterministic(text);
    return {
      ...scoreProfile(
        extraction.requiredValues,
        extraction.missingValues,
        extraction.parameterConfidence,
        extraction.ambiguitySignals
      ),
      ...defaultProfile,
      confidence: extraction.confidence,
      requiredValues: extraction.requiredValues,
      missingValues: extraction.missingValues,
      deterministicPath: extraction.deterministicPath,
      extractedParameters: extraction.extractedParameters,
      parameterConfidence: extraction.parameterConfidence,
      ambiguitySignals: extraction.ambiguitySignals,
    };
  }

  if (problemType === "arithmetic") {
    const extraction = extractArithmeticDeterministic(text);
    return {
      ...scoreProfile(
        extraction.requiredValues,
        extraction.missingValues,
        extraction.parameterConfidence,
        extraction.ambiguitySignals
      ),
      ...defaultProfile,
      confidence: extraction.confidence,
      requiredValues: extraction.requiredValues,
      missingValues: extraction.missingValues,
      deterministicPath: extraction.deterministicPath,
      extractedParameters: extraction.extractedParameters,
      parameterConfidence: extraction.parameterConfidence,
      ambiguitySignals: extraction.ambiguitySignals,
    };
  }

  return defaultProfile;
}

export function evaluateDeterministicReadiness(profile: DeterministicProfile): DeterministicReadiness {
  if (profile.qualityScore < 55) {
    return {
      canExecute: false,
      reason: `Low extraction quality score (${profile.qualityScore}/100).`,
      retryHint: "Rewrite with explicit variable names and numeric values.",
    };
  }

  if (profile.ambiguitySignals.length > 0) {
    return {
      canExecute: false,
      reason: `Ambiguous inputs detected: ${profile.ambiguitySignals.join(", ")}`,
      retryHint: "Provide one unambiguous value for each required parameter.",
    };
  }

  if (profile.missingValues.length === 0) {
    return { canExecute: true };
  }

  if (profile.deterministicPath === "geometry_cylinder_formulas") {
    return {
      canExecute: false,
      reason: `Missing required values: ${profile.missingValues.join(", ")}`,
      retryHint: 'Example: "Find cylinder volume with radius = 7 and height = 10"',
    };
  }

  if (profile.deterministicPath === "geometry_chord_formula") {
    return {
      canExecute: false,
      reason: `Missing required values: ${profile.missingValues.join(", ")}`,
      retryHint: 'Example: "Find chord length when radius = 10 and distance from center = 6"',
    };
  }

  if (profile.deterministicPath === "probability_binomial") {
    return {
      canExecute: false,
      reason: `Missing required values: ${profile.missingValues.join(", ")}`,
      retryHint: 'Example: "Binomial probability with n = 10, k = 3, p = 0.4"',
    };
  }

  if (profile.deterministicPath === "statistics_dataset_ops") {
    return {
      canExecute: false,
      reason: "Missing required values: dataset",
      retryHint: 'Example: "Find mean of [12, 15, 21, 19]"',
    };
  }

  if (profile.problemType === "arithmetic" && profile.confidence === "low") {
    return {
      canExecute: false,
      reason: "Could not identify a reliable arithmetic expression.",
      retryHint: 'Example: "Compute (12 + 8) * 3"',
    };
  }

  return {
    canExecute: true,
  };
}
