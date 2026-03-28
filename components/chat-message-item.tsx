"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Loader2, Copy, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { type PracticeProblem } from "@/components/practice-module";
import { PracticeModule } from "@/components/practice-module";
import { TutorSteps } from "@/components/tutor-steps";
import { type ChatMode, type Message } from "@/components/chat-types";

interface ChatMessageItemProps {
  message: Message;
  markdownComponents: any;
  onGeneratePractice: (originalProblemText: string) => Promise<PracticeProblem | null>;
  onShowExplanation: (messageId: string, mode: ChatMode) => void;
  onShowPractice: (messageId: string, mode: ChatMode) => void;
}

export function ChatMessageItem({
  message,
  markdownComponents,
  onGeneratePractice,
  onShowExplanation,
  onShowPractice,
}: ChatMessageItemProps) {
  const formattedText = normalizeMathMarkdown(message.text);
  const isTutorMessage = message.role === "model" && message.responseType === "tutor_response";
  const isSolverMessage = message.role === "model" && message.responseType === "solver_response";
  const isDiagnosisMessage = message.role === "model" && message.responseType === "diagnosis_response";
  const detailSplitMatch = isSolverMessage
    ? formattedText.match(/(?=\n#\s*(Why This Works|How To Explain It|Common Mistake))/i)
    : null;
  const primaryText = detailSplitMatch ? formattedText.slice(0, detailSplitMatch.index) : formattedText;
  const detailText = detailSplitMatch ? formattedText.slice(detailSplitMatch.index || 0) : "";
  const practiceAction = message.actions?.find((action) => action.type === "create_similar_practice");

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center gap-2 mb-1.5">
        {message.role === "model" ? (
          <>
            <div className="w-5 h-5 rounded bg-zinc-900 flex items-center justify-center flex-shrink-0">
              <Bot size={12} className="text-white" />
            </div>
            <span className="text-xs font-medium text-zinc-900">ParentMathHelper</span>
          </>
        ) : (
          <>
            <div className="w-5 h-5 rounded bg-zinc-200 flex items-center justify-center flex-shrink-0">
              <User size={12} className="text-zinc-600" />
            </div>
            <span className="text-xs font-medium text-zinc-900">You</span>
          </>
        )}
      </div>

      <div className={cn("w-full text-[15px] leading-relaxed text-zinc-800", message.role === "user" ? "pl-7" : "pt-2")}>
        {message.image && (
          <div className="mb-3 rounded-lg overflow-hidden border border-zinc-200 inline-block">
            <img src={message.image} alt="Uploaded math problem" className="max-w-sm h-auto max-h-64 object-contain bg-zinc-50" />
          </div>
        )}

        {message.text && (
          <div className="prose prose-zinc max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-50 prose-pre:border prose-pre:border-zinc-200 prose-pre:text-zinc-800 prose-code:text-zinc-800 prose-code:bg-zinc-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none [&_p]:break-words [&_li]:break-words [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1 [&_.custom-ol>li]:relative [&_.custom-ol>li]:pl-8 [&_.custom-ol>li]:[counter-increment:step-counter] [&_.custom-ol>li]:before:content-[counter(step-counter)] [&_.custom-ol>li]:before:absolute [&_.custom-ol>li]:before:left-0 [&_.custom-ol>li]:before:top-1 [&_.custom-ol>li]:before:flex [&_.custom-ol>li]:before:items-center [&_.custom-ol>li]:before:justify-center [&_.custom-ol>li]:before:w-5 [&_.custom-ol>li]:before:h-5 [&_.custom-ol>li]:before:bg-zinc-200 [&_.custom-ol>li]:before:text-zinc-600 [&_.custom-ol>li]:before:rounded-full [&_.custom-ol>li]:before:text-[11px] [&_.custom-ol>li]:before:font-bold">
            {(() => {
              if (isTutorMessage && formattedText.includes("### Step")) {
                const parts = formattedText.split(/(?=# Solution Steps)/i);
                const beforeSteps = parts[0];
                const stepsPart = parts[1] || "";
                const stepParts = stepsPart.split(/(?=### Step)/i);
                const stepsHeader = stepParts[0];
                const steps = stepParts.slice(1);

                return (
                  <>
                    <ReactMarkdown
                      remarkPlugins={[remarkMath, remarkGfm]}
                      rehypePlugins={[rehypeKatex]}
                      components={markdownComponents}
                    >
                      {beforeSteps + stepsHeader}
                    </ReactMarkdown>
                    {steps.length > 0 && (
                      <TutorSteps steps={steps} markdownComponents={markdownComponents} />
                    )}
                  </>
                );
              }

              return (
                <>
                  {message.role === "model" && message.teachingMeta?.gradeBand && (
                    <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700">
                        {message.teachingMeta.gradeBand}
                      </span>
                      {message.teachingMeta.commonSkill && (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                          {toTitleCase(message.teachingMeta.commonSkill)}
                        </span>
                      )}
                    </div>
                  )}
                  <ReactMarkdown
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[rehypeKatex]}
                    components={markdownComponents}
                  >
                    {isSolverMessage ? primaryText : formattedText}
                  </ReactMarkdown>

                  <AnimatePresence>
                    {isSolverMessage && Boolean(detailText) && message.isExplanationVisible && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkMath, remarkGfm]}
                          rehypePlugins={[rehypeKatex]}
                          components={markdownComponents}
                        >
                          {detailText}
                        </ReactMarkdown>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              );
            })()}
          </div>
        )}

        {message.isStreaming && !message.text && (
          <div className="flex items-center gap-2 text-zinc-400 py-1">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        {message.role === "model" && !message.isStreaming && message.text && (
          <div className="flex items-center gap-2 mt-4 text-zinc-500 flex-wrap">
            {isSolverMessage &&
              Boolean(detailText) &&
              !message.isExplanationVisible && (
              <button
                onClick={() => onShowExplanation(message.id, message.mode)}
                className="text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-1.5 rounded-full transition-colors mr-2"
              >
                Show teaching notes
              </button>
            )}
            {practiceAction && message.sourceProblem && !message.isPracticeVisible && (
              <button
                onClick={() => onShowPractice(message.id, message.mode)}
                className="text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-1.5 rounded-full transition-colors"
              >
                {practiceAction.label}
              </button>
            )}
            <button className="p-1.5 hover:bg-zinc-100 rounded-md transition-colors hover:text-zinc-900"><Copy size={16} /></button>
            <button className="p-1.5 hover:bg-zinc-100 rounded-md transition-colors hover:text-zinc-900"><RefreshCcw size={16} /></button>
          </div>
        )}

        {message.role === "model" && message.isPracticeVisible && message.sourceProblem && (
          <PracticeModule
            originalProblem={message.sourceProblem}
            onGenerate={() => onGeneratePractice(message.sourceProblem!)}
          />
        )}
      </div>
    </div>
  );
}

function toTitleCase(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeMathMarkdown(text: string) {
  if (!text || text.includes("$")) return text;

  return text
    .split("\n")
    .map((line) => wrapMathExpressions(line))
    .join("\n");
}

function wrapMathExpressions(line: string) {
  if (!line.trim()) return line;
  if (/^\s*#/.test(line)) return line;

  const mathPattern =
    /(\(?[A-Za-z0-9]+\s*(?:[-+*/=×]\s*|\^\s*)[\s\S]*?(?:\d|[A-Za-z])(?:\^\d+)?(?:\s*=\s*[\s\S]*?(?:\d|[A-Za-z]))?)/g;

  const wrapMatch = (_match: string, expr: string) => {
    const cleaned = expr.trim().replace(/\.$/, "");
    if (cleaned.includes("$")) return expr;
    if (!/[=^×+\-/*()]/.test(cleaned)) return expr;
    return `$${cleaned}$`;
  };

  if (/^\s*[-*]\s+/.test(line)) {
    const bulletPrefix = line.match(/^\s*[-*]\s+/)?.[0] || "";
    const content = line.slice(bulletPrefix.length).replace(mathPattern, wrapMatch);
    return `${bulletPrefix}${content}`;
  }

  return line.replace(mathPattern, wrapMatch);
}
