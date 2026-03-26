"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Loader2, Copy, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { type PracticeProblem } from "@/components/practice-module";
import { TutorSteps } from "@/components/tutor-steps";
import { CodeInterpreterView } from "@/components/code-interpreter-view";
import { type ChatMode, type Message } from "@/components/chat-types";

interface ChatMessageItemProps {
  message: Message;
  mode: ChatMode;
  markdownComponents: any;
  onGeneratePractice: (originalProblemText: string) => Promise<PracticeProblem | null>;
  onShowExplanation: (messageId: string) => void;
}

export function ChatMessageItem({
  message,
  mode,
  markdownComponents,
  onGeneratePractice,
  onShowExplanation,
}: ChatMessageItemProps) {
  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center gap-2 mb-1.5">
        {message.role === "model" ? (
          <>
            <div className="w-5 h-5 rounded bg-zinc-900 flex items-center justify-center flex-shrink-0">
              <Bot size={12} className="text-white" />
            </div>
            <span className="text-xs font-medium text-zinc-900">Gauth AI</span>
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

        {message.role === "model" && message.symbolic?.code && (
          <div className="mb-4">
            <CodeInterpreterView
              code={message.symbolic.code}
              output={message.symbolic.output}
              error={message.symbolic.error}
              language="python"
              title={`Solve ${message.symbolic.problemType || "math problem"}`}
              status={message.symbolic.status || (message.symbolic.error ? "error" : "completed")}
            />
            {message.symbolic.error && (message.symbolic.retryHint || message.symbolic.errorCode) && (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {message.symbolic.errorCode ? `Error Code: ${message.symbolic.errorCode}` : ""}
                {message.symbolic.errorCode && message.symbolic.retryHint ? " • " : ""}
                {message.symbolic.retryHint || ""}
                {typeof message.symbolic.qualityScore === "number" ? ` • Quality: ${message.symbolic.qualityScore}/100` : ""}
                {message.symbolic.ambiguitySignals && message.symbolic.ambiguitySignals.length > 0 ? ` • Ambiguity: ${message.symbolic.ambiguitySignals.join(", ")}` : ""}
              </div>
            )}
          </div>
        )}

        {message.text && (
          <div className="prose prose-zinc max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-50 prose-pre:border prose-pre:border-zinc-200 prose-pre:text-zinc-800 prose-code:text-zinc-800 prose-code:bg-zinc-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none [&_p]:break-words [&_li]:break-words [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1 [&_.custom-ol>li]:relative [&_.custom-ol>li]:pl-8 [&_.custom-ol>li]:[counter-increment:step-counter] [&_.custom-ol>li]:before:content-[counter(step-counter)] [&_.custom-ol>li]:before:absolute [&_.custom-ol>li]:before:left-0 [&_.custom-ol>li]:before:top-1 [&_.custom-ol>li]:before:flex [&_.custom-ol>li]:before:items-center [&_.custom-ol>li]:before:justify-center [&_.custom-ol>li]:before:w-5 [&_.custom-ol>li]:before:h-5 [&_.custom-ol>li]:before:bg-zinc-200 [&_.custom-ol>li]:before:text-zinc-600 [&_.custom-ol>li]:before:rounded-full [&_.custom-ol>li]:before:text-[11px] [&_.custom-ol>li]:before:font-bold">
            {(() => {
              if (mode === "tutor" && message.text.includes("### Step")) {
                const parts = message.text.split(/(?=# Solution Steps)/i);
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
                      <TutorSteps
                        steps={steps}
                        markdownComponents={markdownComponents}
                        originalText={message.text}
                        onGeneratePractice={() => onGeneratePractice(message.text)}
                      />
                    )}
                  </>
                );
              }

              return (
                <>
                  <ReactMarkdown
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[rehypeKatex]}
                    components={markdownComponents}
                  >
                    {message.text.split(/(?=# Explanation)/i)[0]}
                  </ReactMarkdown>

                  <AnimatePresence>
                    {message.isExplanationVisible && message.text.match(/(?=# Explanation)/i) && (
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
                          {message.text.split(/(?=# Explanation)/i).slice(1).join("")}
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
          <div className="flex items-center gap-2 mt-4 text-zinc-500">
            {message.text.match(/(?=# Explanation)/i) && !message.isExplanationVisible && (
              <button
                onClick={() => onShowExplanation(message.id)}
                className="text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-1.5 rounded-full transition-colors mr-2"
              >
                Explain it
              </button>
            )}
            <button className="p-1.5 hover:bg-zinc-100 rounded-md transition-colors hover:text-zinc-900"><Copy size={16} /></button>
            <button className="p-1.5 hover:bg-zinc-100 rounded-md transition-colors hover:text-zinc-900"><RefreshCcw size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
