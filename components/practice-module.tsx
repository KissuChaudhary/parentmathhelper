import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Lightbulb, Target, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

export interface PracticeProblem {
  problem_latex: string;
  correct_answer: string;
  parent_hint: string;
  success_message: string;
}

interface PracticeModuleProps {
  originalProblem: string;
  onGenerate: () => Promise<PracticeProblem | null>;
}

export function PracticeModule({ originalProblem, onGenerate }: PracticeModuleProps) {
  const [state, setState] = useState<"initial" | "loading" | "active" | "success">("initial");
  const [problem, setProblem] = useState<PracticeProblem | null>(null);
  const [input, setInput] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [error, setError] = useState(false);

  const handleGenerate = async () => {
    setState("loading");
    const newProblem = await onGenerate();
    if (newProblem) {
      setProblem(newProblem);
      setState("active");
      setInput("");
      setShowHint(false);
      setError(false);
    } else {
      setState("initial");
    }
  };

  const normalizeMath = (str: string) => {
    return str.replace(/\s+/g, "").toLowerCase();
  };

  const handleCheck = () => {
    if (!problem) return;
    
    const normalizedInput = normalizeMath(input);
    const normalizedCorrect = normalizeMath(problem.correct_answer);
    
    if (normalizedInput === normalizedCorrect) {
      setState("success");
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="mt-8 border-t border-zinc-100 pt-6">
      {state === "initial" && (
        <button
          onClick={handleGenerate}
          className="w-full py-4 px-6 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-700 font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Target size={20} />
          🎯 Try a Practice Problem Together
        </button>
      )}

      {state === "loading" && (
        <div className="w-full py-8 flex flex-col items-center justify-center gap-3 text-emerald-600 bg-emerald-50/50 rounded-xl border border-emerald-100">
          <Loader2 size={24} className="animate-spin" />
          <span className="text-sm font-medium">Generating a similar problem...</span>
        </div>
      )}

      {(state === "active" || state === "success") && problem && (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-200">
            <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <Target size={16} className="text-emerald-600" />
              Practice Problem
            </h3>
          </div>
          
          <div className="p-6">
            <div className="text-lg mb-6 flex justify-center py-4 bg-zinc-50 rounded-lg overflow-x-auto">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {`$$${problem.problem_latex}$$`}
              </ReactMarkdown>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setError(false);
                  }}
                  disabled={state === "success"}
                  placeholder="Type your answer here..."
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all",
                    error 
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/30" 
                      : state === "success"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900 font-medium"
                        : "border-zinc-300 focus:border-emerald-500 focus:ring-emerald-200"
                  )}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && state !== "success") {
                      handleCheck();
                    }
                  }}
                />
                <button
                  onClick={handleCheck}
                  disabled={state === "success" || !input.trim()}
                  className="px-6 py-2.5 bg-zinc-900 text-white font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  Check Answer
                </button>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg"
                  >
                    <XCircle size={16} />
                    Not quite! Check your signs, or ask your parent for a hint.
                  </motion.div>
                )}

                {state === "success" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-emerald-700 text-sm font-medium bg-emerald-50 p-4 rounded-lg border border-emerald-200"
                  >
                    <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                    {problem.success_message}
                  </motion.div>
                )}
              </AnimatePresence>

              {state !== "success" && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="text-sm text-zinc-500 hover:text-zinc-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Lightbulb size={14} />
                    Need a hint?
                  </button>
                  
                  <AnimatePresence>
                    {showHint && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <blockquote className="mt-3 p-4 bg-amber-50 border-l-4 border-amber-400 text-amber-900 text-sm rounded-r-lg">
                          <strong className="font-semibold block mb-1">Parent Hint:</strong>
                          {problem.parent_hint}
                        </blockquote>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
