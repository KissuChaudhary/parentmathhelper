"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Paperclip, 
  ArrowUp, 
  X,
  PenTool,
  Zap,
  BrainCircuit,
  Brain,
  CircleHelp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DrawingCanvas } from "./drawing-canvas";

interface PromptInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  selectedImage: string | null;
  setSelectedImage: (image: string | null) => void;
  onImageUpload: () => void;
  mode: "solver" | "tutor";
  setMode: (mode: "solver" | "tutor") => void;
  diagnoseEnabled: boolean;
  setDiagnoseEnabled: (enabled: boolean) => void;
}

export function PromptInput({
  input,
  setInput,
  onSubmit,
  isLoading,
  selectedImage,
  setSelectedImage,
  onImageUpload,
  mode,
  setMode,
  diagnoseEnabled,
  setDiagnoseEnabled,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const diagnoseInfoRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isDiagnoseInfoOpen, setIsDiagnoseInfoOpen] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!diagnoseInfoRef.current) return;
      const target = event.target as Node;
      if (!diagnoseInfoRef.current.contains(target)) {
        setIsDiagnoseInfoOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <>
      <DrawingCanvas 
        isOpen={isCanvasOpen} 
        onClose={() => setIsCanvasOpen(false)} 
        onSave={(dataUrl) => setSelectedImage(dataUrl)} 
      />
      <div className="w-full max-w-[960px] mx-auto px-4">
        <div className={cn(
          "relative border transition-colors duration-300 rounded-2xl p-[3px]",
          mode === "solver" 
            ? "border-[#DBDBDB]/60 bg-[#F8F8F8]" 
            : "border-emerald-100 bg-emerald-50/30"
        )}>
          {/* Header Area */}
          <div className="flex px-3 mb-1 items-center justify-between gap-3 text-zinc-500">
            <div className="flex min-w-0 items-center">
             <span className={cn(
               "leading-6 text-[13px] font-medium text-nowrap mr-1",
               mode === "tutor" && "text-emerald-600"
             )}>
               {mode === "solver" ? "Solver:" : "Tutor:"}
             </span> 
             <span className="leading-6 text-xs truncate min-w-0 opacity-80">
               {diagnoseEnabled
                 ? mode === "solver"
                   ? "Review your child’s work from a photo, upload, or annotation"
                   : "Review your child’s work and turn it into parent coaching"
                 : mode === "solver" 
                   ? "School-friendly steps for Grades 3-6 homework" 
                   : "Parent coaching for fractions, division, and word problems"}
             </span>
            </div>
            <div ref={diagnoseInfoRef} className="relative shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setDiagnoseEnabled(!diagnoseEnabled);
                    setIsDiagnoseInfoOpen(false);
                  }}
                  disabled={isLoading}
                  aria-pressed={diagnoseEnabled}
                  aria-label={diagnoseEnabled ? "Disable diagnose mode" : "Enable diagnose mode"}
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-200 disabled:opacity-50",
                    diagnoseEnabled
                      ? "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                  )}
                >
                  <Brain size={16} />
                </button>
                <button
                  type="button"
                  aria-label="What diagnose mode does"
                  onClick={() => setIsDiagnoseInfoOpen((prev) => !prev)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <CircleHelp size={15} />
                </button>
              </div>

              <AnimatePresence>
                {isDiagnoseInfoOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute bottom-full right-0 z-40 mb-3 w-80 max-w-[calc(100vw-2rem)] origin-bottom-right overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)]"
                  >
                    <div className="absolute -bottom-2 right-4 h-4 w-4 rotate-45 border-b border-r border-zinc-200 bg-white" />
                    <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                      <p className="text-sm font-semibold text-zinc-900">Diagnose mode</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Built for reviewing your child’s written work without changing your current Solve or Teach mode.
                      </p>
                    </div>
                    <div className="space-y-2 px-4 py-3 text-xs leading-5 text-zinc-600">
                      <p>
                        Upload a notebook photo, worksheet snap, or annotated image and I’ll review the work in the current mode.
                      </p>
                      <ul className="space-y-1.5 text-zinc-500">
                        <li>• Solve It: spot the first math step to double-check</li>
                        <li>• Teach It: explain what the child likely misunderstood</li>
                        <li>• Works with upload, camera, drawing, or a short note</li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="relative flex flex-col bg-white rounded-xl border border-[#0000001F] shadow-[0px_4px_16px_0px_#0000000D] overflow-hidden transition-colors duration-300">
            
            {/* Image Preview */}
            <AnimatePresence>
              {selectedImage && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3 pt-3"
                >
                  <div className="relative inline-block w-20 h-20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={selectedImage} 
                      alt="Upload preview" 
                      className="w-full h-full object-cover rounded-xl border border-zinc-200"
                    />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-2 -right-2 bg-white border border-zinc-200 rounded-full p-1 hover:bg-zinc-100 text-zinc-500 transition-colors z-10 shadow-sm"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Textarea */}
            <div className="relative py-3 px-4">  
              <textarea 
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={
                  diagnoseEnabled
                    ? "Add a photo, upload, draw on the work, or type what you want me to check..."
                    : mode === "solver"
                      ? "Paste a fraction, long division, decimal, or word problem..."
                      : "Ask how to explain the homework method to your child..."
                }
                className="w-full max-h-[216px] text-sm bg-transparent resize-none outline-none placeholder:text-zinc-400"
                style={{ height: "40px" }}
                rows={1}
              />
            </div>

            {/* Bottom Bar */}
            <div className="flex justify-between items-center p-3 pt-0 max-w-full">
              {/* Left Actions */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={onImageUpload}
                  className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                  title="Upload image"
                >
                  <Paperclip size={18} />
                </button>
                <button 
                  onClick={() => setIsCanvasOpen(true)}
                  className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                  title="Open canvas"
                >
                  <PenTool size={18} />
                </button>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-3">
                {/* Mode Switcher */}
                <div className="bg-zinc-100 p-1 rounded-lg border border-zinc-200 flex relative">
                  <div 
                    className={cn(
                      "absolute inset-y-1 w-[calc(50%-4px)] bg-white shadow-sm rounded-md transition-all duration-300 ease-out",
                      mode === "solver" ? "left-1" : "left-[calc(50%)]"
                    )} 
                  />
                  <button 
                    onClick={() => setMode("solver")}
                    disabled={isLoading || diagnoseEnabled}
                    className={cn(
                      "relative z-10 px-3 py-1 text-xs font-medium transition-colors duration-200 flex items-center gap-1.5 disabled:opacity-50",
                      mode === "solver"
                        ? "text-zinc-900"
                        : diagnoseEnabled
                          ? "text-zinc-400"
                          : "text-zinc-500 hover:text-zinc-900"
                    )}
                  >
                    <Zap size={12} />
                    Solve It
                  </button>
                  <button 
                    onClick={() => setMode("tutor")}
                    disabled={isLoading || diagnoseEnabled}
                    className={cn(
                      "relative z-10 px-3 py-1 text-xs font-medium transition-colors duration-200 flex items-center gap-1.5 disabled:opacity-50",
                      mode === "tutor"
                        ? "text-emerald-700"
                        : diagnoseEnabled
                          ? "text-zinc-400"
                          : "text-zinc-500 hover:text-zinc-900"
                    )}
                  >
                    <BrainCircuit size={12} />
                    Teach It
                  </button>
                </div>

                {/* Submit Button */}
                <button 
                  onClick={onSubmit}
                  disabled={isLoading || (!input.trim() && !selectedImage)}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                    (input.trim() || selectedImage) && !isLoading 
                      ? (mode === "solver" ? "bg-black text-white hover:bg-zinc-800" : "bg-emerald-600 text-white hover:bg-emerald-700") 
                      : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                  )}
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-3">
           <p className="text-xs text-zinc-400">
             Built for parent-guided Grades 3-6 math help. Double-check important homework answers.
           </p>
        </div>
      </div>
    </>
  );
}
