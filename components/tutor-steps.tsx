"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TutorStepsProps {
  steps: string[];
  markdownComponents: any;
}

export function TutorSteps({ steps, markdownComponents }: TutorStepsProps) {
  const [openStep, setOpenStep] = useState<number>(0);

  return (
    <div className="flex flex-col gap-3 mt-4">
      {steps.map((step, index) => {
        const lines = step.trim().split("\n");
        const titleLine = lines[0].replace(/^###\s*/, "");
        const content = lines.slice(1).join("\n");
        const isOpen = index <= openStep;

        return (
          <div key={index} className="border border-emerald-100 rounded-xl overflow-hidden bg-white shadow-sm">
            <button
              onClick={() => setOpenStep(index)}
              className={cn(
                "w-full flex items-center justify-between p-4 text-left transition-colors",
                isOpen ? "bg-emerald-50/50" : "hover:bg-zinc-50"
              )}
              disabled={isOpen}
            >
              <span className="font-semibold text-emerald-900">{titleLine}</span>
              {!isOpen && <ChevronDown size={18} className="text-emerald-600" />}
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-2 border-t border-emerald-50">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath, remarkGfm]}
                      rehypePlugins={[rehypeKatex]}
                      components={markdownComponents}
                    >
                      {content}
                    </ReactMarkdown>

                    {index === openStep && index < steps.length - 1 && (
                      <button
                        onClick={() => setOpenStep(index + 1)}
                        className="mt-4 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors flex items-center gap-2"
                      >
                        Next Step <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

    </div>
  );
}
