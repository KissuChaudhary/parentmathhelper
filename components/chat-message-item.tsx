"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Loader2, Copy, RefreshCcw, SquareSigma } from "lucide-react";
import { cn } from "@/lib/utils";
import { type PracticeProblem } from "@/components/practice-module";
import { PracticeModule } from "@/components/practice-module";
import { TutorSteps } from "@/components/tutor-steps";
import { type ChatMode, type DiagnosisSection, type Message, type MessageActionType } from "@/components/chat-types";

interface ChatMessageItemProps {
  message: Message;
  markdownComponents: any;
  onGeneratePractice: (originalProblemText: string) => Promise<PracticeProblem | null>;
  onShowExplanation: (messageId: string, mode: ChatMode) => void;
  onRunAction: (message: Message, actionType: MessageActionType) => void;
  onCopyMessage: (message: Message) => void;
  onRetryMessage: (message: Message) => void;
  activeActionKey: string | null;
  copiedMessageId: string | null;
}

export function ChatMessageItem({
  message,
  markdownComponents,
  onGeneratePractice,
  onShowExplanation,
  onRunAction,
  onCopyMessage,
  onRetryMessage,
  activeActionKey,
  copiedMessageId,
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
  const diagnosisSections = isDiagnosisMessage
    ? message.diagnosisResult?.sections?.length
      ? message.diagnosisResult.sections
      : extractMarkdownSections(formattedText)
    : [];
  const visibleActions = (message.actions || []).filter(
    (action) => !(action.type === "create_similar_practice" && (!message.sourceProblem || message.isPracticeVisible))
  );
  const retryActionKey = `retry:${message.id}`;
  const primaryActionType = visibleActions[0]?.type;

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

      <div className={cn("w-full text-[15px] leading-7 text-zinc-800 md:text-base", message.role === "user" ? "pl-7" : "pt-1.5")}>
        {message.image && (
          <div className="mb-3 rounded-lg overflow-hidden border border-zinc-200 inline-block">
            <Image
              src={message.image}
              alt="Uploaded math problem"
              width={448}
              height={256}
              unoptimized
              className="max-w-sm h-auto max-h-64 object-contain bg-zinc-50"
            />
          </div>
        )}

        {message.text && (
          <div className="prose prose-base prose-zinc max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-50 prose-pre:border prose-pre:border-zinc-200 prose-pre:text-zinc-800 prose-code:text-zinc-800 prose-code:bg-zinc-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none [&_p]:break-words [&_li]:break-words [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1 [&_.custom-ol>li]:relative [&_.custom-ol>li]:pl-8 [&_.custom-ol>li]:[counter-increment:step-counter] [&_.custom-ol>li]:before:content-[counter(step-counter)] [&_.custom-ol>li]:before:absolute [&_.custom-ol>li]:before:left-0 [&_.custom-ol>li]:before:top-1 [&_.custom-ol>li]:before:flex [&_.custom-ol>li]:before:items-center [&_.custom-ol>li]:before:justify-center [&_.custom-ol>li]:before:w-5 [&_.custom-ol>li]:before:h-5 [&_.custom-ol>li]:before:bg-zinc-200 [&_.custom-ol>li]:before:text-zinc-600 [&_.custom-ol>li]:before:rounded-full [&_.custom-ol>li]:before:text-[14px] [&_.custom-ol>li]:before:font-bold">
            {(() => {
              if (isDiagnosisMessage && diagnosisSections.length > 0) {
                return (
                  <div className="not-prose space-y-3">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        Child Work Review
                      </div>
                      <p className="mt-1 text-[15px] leading-6 text-zinc-600">
                        {message.diagnosisResult?.summary || "A calm read of what looks solid, what to check next, and what to say out loud."}
                      </p>
                    </div>
                    {diagnosisSections.map((section) => {
                      const tone = getDiagnosisTone(section.title);
                      return (
                        <div
                          key={section.title}
                          className={cn("rounded-2xl border px-4 py-3", tone.cardClassName)}
                        >
                          <div className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", tone.labelClassName)}>
                            {section.title}
                          </div>
                          <div className="mt-2 prose prose-sm max-w-none prose-zinc prose-p:my-2 prose-ul:my-2 prose-li:my-1 [&_p]:break-words [&_li]:break-words">
                            <ReactMarkdown
                              remarkPlugins={[remarkMath, remarkGfm]}
                              rehypePlugins={[rehypeKatex]}
                              components={markdownComponents}
                            >
                              {section.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }

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
                    <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
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
          <div className="mt-3.5 flex flex-wrap items-center gap-2 text-zinc-500">
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
            {visibleActions.map((action) => (
              <button
                key={action.type}
                type="button"
                onClick={() => onRunAction(message, action.type)}
                disabled={Boolean(activeActionKey)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  action.type === primaryActionType
                    ? message.mode === "solver"
                      ? "bg-zinc-900 text-white hover:bg-zinc-800"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                    : action.type === "create_similar_practice"
                      ? "bg-zinc-200/90 text-black hover:bg-zinc-200"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                )}
              >
                {activeActionKey === `${message.id}:${action.type}` && <Loader2 size={13} className="animate-spin" />}
                {action.label}
                {action.type === "create_similar_practice" && <SquareSigma size={12} />}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onCopyMessage(message)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                copiedMessageId === message.id
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              <Copy size={14} />
              {copiedMessageId === message.id ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => onRetryMessage(message)}
              disabled={Boolean(activeActionKey)}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeActionKey === retryActionKey ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              Try again
            </button>
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

function extractMarkdownSections(text: string): DiagnosisSection[] {
  const matches = [...text.matchAll(/(?:^|\n)#\s*([^\n]+)\n([\s\S]*?)(?=\n#\s+[^\n]+\n|$)/g)];
  return matches
    .map((match) => ({
      key: "other" as const,
      title: match[1]?.trim() || "",
      content: match[2]?.trim() || "",
    }))
    .filter((section) => section.title && section.content);
}

function getDiagnosisTone(title: string) {
  const normalized = title.toLowerCase();

  if (normalized.includes("looks right")) {
    return {
      cardClassName: "border-emerald-200 bg-emerald-50/70",
      labelClassName: "text-emerald-700",
    };
  }

  if (normalized.includes("double-check") || normalized.includes("check next")) {
    return {
      cardClassName: "border-amber-200 bg-amber-50/80",
      labelClassName: "text-amber-700",
    };
  }

  if (normalized.includes("better next step")) {
    return {
      cardClassName: "border-blue-200 bg-blue-50/80",
      labelClassName: "text-blue-700",
    };
  }

  if (normalized.includes("say next")) {
    return {
      cardClassName: "border-violet-200 bg-violet-50/80",
      labelClassName: "text-violet-700",
    };
  }

  return {
    cardClassName: "border-zinc-200 bg-zinc-50",
    labelClassName: "text-zinc-700",
  };
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
