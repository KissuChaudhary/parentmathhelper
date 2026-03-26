export type ChatMode = "solver" | "tutor";

export type SymbolicExecution = {
  problemType?: string;
  deterministicPath?: string;
  classifierConfidence?: "high" | "medium" | "low";
  requiredValues?: string[];
  missingValues?: string[];
  extractedParameters?: Record<string, number | number[]>;
  parameterConfidence?: Record<string, "high" | "medium" | "low">;
  ambiguitySignals?: string[];
  qualityScore?: number;
  qualityBreakdown?: {
    completeness: number;
    parameterConfidence: number;
    ambiguityPenalty: number;
  };
  canExecuteDeterministic?: boolean;
  blockingReason?: string;
  blockingRetryHint?: string;
  code?: string;
  output?: string;
  error?: string;
  errorCode?: string;
  retryHint?: string;
  runtime?: "daytona" | "python" | "none";
  status?: "running" | "completed" | "error";
};

export type Message = {
  id: string;
  role: "user" | "model";
  text: string;
  image?: string;
  isStreaming?: boolean;
  isExplanationVisible?: boolean;
  symbolic?: SymbolicExecution;
};
