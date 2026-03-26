"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, XCircle, Lightbulb, Target, Loader2 } from "lucide-react";
import "katex/dist/katex.min.css";
import Latex from "react-latex-next";

interface PracticeModuleProps {
  originalProblem: string;
}

interface PracticeData {
  problem_latex: string;
  correct_answer: string;
  parent_hint: string;
  success_message: string;
}

export function PracticeModule({ originalProblem }: PracticeModuleProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "active" | "success">("idle");
  const [practiceData, setPracticeData] = useState<PracticeData | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const generateProblem = async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const response = await fetch("/api/generate-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalProblem }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate problem");
      }
      
      const data = await response.json();
      setPracticeData(data);
      setStatus("active");
      setUserAnswer("");
      setShowHint(false);
    } catch (error) {
      console.error(error);
      // Fallback for demo if API fails
      setPracticeData({
        problem_latex: "x^2 - 6x + 9 = 0",
        correct_answer: "x = 3",
        parent_hint: "What number multiplies to 9 and adds to -6?",
        success_message: "Awesome job! You nailed that quadratic equation! 🎉",
      });
      setStatus("active");
    }
  };

  const normalizeAnswer = (ans: string) => {
    return ans
      .replace(/\s+/g, "")
      .toLowerCase()
      .replace(/\\/g, "") // remove latex slashes
      .replace(/[{}]/g, ""); // remove latex brackets
  };

  const checkAnswer = () => {
    if (!practiceData) return;
    
    const normalizedUser = normalizeAnswer(userAnswer);
    const normalizedCorrect = normalizeAnswer(practiceData.correct_answer);
    
    // Basic fuzzy matching
    if (normalizedUser === normalizedCorrect || normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser)) {
      setStatus("success");
      setErrorMsg("");
    } else {
      setErrorMsg("Not quite! Check your signs, or ask your parent for a hint.");
    }
  };

  return (
    <div className="mt-8 border-t border-gray-200 pt-8">
      {status === "idle" && (
        <div className="flex justify-center">
          <button
            onClick={generateProblem}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Target className="w-5 h-5" />
            🎯 Try a Practice Problem Together
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
          <p>Generating a perfect practice problem...</p>
        </div>
      )}

      {(status === "active" || status === "success") && practiceData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 max-w-2xl mx-auto"
        >
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Practice Problem</h3>
            <div className="text-2xl py-4 bg-gray-50 rounded-xl overflow-x-auto">
              <Latex>{`$$${practiceData.problem_latex}$$`}</Latex>
            </div>
          </div>

          {status === "active" && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => {
                    setUserAnswer(e.target.value);
                    setErrorMsg("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && checkAnswer()}
                  placeholder="Type your answer here..."
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
                <button
                  onClick={checkAnswer}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors whitespace-nowrap"
                >
                  Check Answer
                </button>
              </div>

              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-600 flex items-center gap-2 text-sm bg-red-50 p-3 rounded-lg"
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-4 border-t border-gray-100 flex flex-col items-start">
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                >
                  <Lightbulb className="w-4 h-4" />
                  {showHint ? "Hide hint" : "Need a hint?"}
                </button>
                
                <AnimatePresence>
                  {showHint && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden w-full"
                    >
                      <blockquote className="mt-3 border-l-4 border-indigo-200 bg-indigo-50/50 text-indigo-900 p-4 rounded-r-lg text-sm italic">
                        <span className="font-semibold not-italic block mb-1 text-indigo-700">Parent Hint:</span>
                        {practiceData.parent_hint}
                      </blockquote>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h4 className="text-emerald-900 font-semibold text-lg mb-1">Correct!</h4>
              <p className="text-emerald-700">{practiceData.success_message}</p>
              
              <div className="mt-6">
                <button
                  onClick={generateProblem}
                  className="text-emerald-700 hover:text-emerald-800 font-medium text-sm underline underline-offset-2"
                >
                  Try another one
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
