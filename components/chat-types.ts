export type ChatMode = "solver" | "tutor";
export type DraftImageIntent = "solve_from_image" | "teach_from_image" | "diagnose_from_image";
export type MessageResponseType =
  | "user_input"
  | "solver_response"
  | "tutor_response"
  | "diagnosis_response"
  | "system_notice";
export type MessageActionType =
  | "create_similar_practice"
  | "solver_another_method"
  | "solver_verify_answer"
  | "solver_break_down_step"
  | "tutor_another_analogy"
  | "tutor_shorten_explanation"
  | "tutor_adjust_language"
  | "tutor_help_stuck_step";

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

export type DiagnosisSectionKey =
  | "what_looks_right"
  | "what_to_double_check"
  | "what_to_check_next"
  | "better_next_step"
  | "what_to_say_next"
  | "quick_check"
  | "original_problem"
  | "other";

export type DiagnosisSection = {
  key: DiagnosisSectionKey;
  title: string;
  content: string;
};

export type DiagnosisResult = {
  mode: ChatMode;
  summary: string;
  sections: DiagnosisSection[];
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
  requestInput?: string;
  diagnosisResult?: DiagnosisResult;
};
