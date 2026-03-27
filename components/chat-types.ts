export type ChatMode = "solver" | "tutor";

export type TeachingMeta = {
  mode?: ChatMode;
  gradeBand?: string;
  confidence?: "high" | "medium" | "low";
  validationPassed?: boolean;
  commonSkill?: string;
  hasPractice?: boolean;
  status?: "running" | "completed" | "error";
  source?: "llm" | "offline";
  contentVersion?: string;
};

export type Message = {
  id: string;
  role: "user" | "model";
  text: string;
  image?: string;
  isStreaming?: boolean;
  isExplanationVisible?: boolean;
  teachingMeta?: TeachingMeta;
};
