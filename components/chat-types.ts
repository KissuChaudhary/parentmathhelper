export type ChatMode = "solver" | "tutor";
export type MessageResponseType =
  | "user_input"
  | "solver_response"
  | "tutor_response"
  | "diagnosis_response"
  | "system_notice";
export type MessageActionType = "create_similar_practice";

export type MessageAction = {
  type: MessageActionType;
  label: string;
};

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
  mode: ChatMode;
  responseType: MessageResponseType;
  text: string;
  image?: string;
  isStreaming?: boolean;
  isExplanationVisible?: boolean;
  isPracticeVisible?: boolean;
  sourceProblem?: string;
  actions?: MessageAction[];
  teachingMeta?: TeachingMeta;
};
