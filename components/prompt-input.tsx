"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Paperclip, 
  ArrowUp, 
  X,
  PenTool,
  Zap,
  BrainCircuit
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
  setMode
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

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
          <div className="flex px-3 mb-1 items-center text-zinc-500">
             <span className={cn(
               "leading-6 text-[13px] font-medium text-nowrap mr-1",
               mode === "tutor" && "text-emerald-600"
             )}>
               {mode === "solver" ? "Solver:" : "Tutor:"}
             </span> 
             <span className="leading-6 text-xs truncate min-w-0 opacity-80">
               {mode === "solver" 
                 ? "School-friendly steps for Grades 3-6 homework" 
                 : "Parent coaching for fractions, division, and word problems"}
             </span>
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
                  mode === "solver"
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
                    className={cn(
                      "relative z-10 px-3 py-1 text-xs font-medium transition-colors duration-200 flex items-center gap-1.5",
                      mode === "solver" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
                    )}
                  >
                    <Zap size={12} />
                    Solve It
                  </button>
                  <button 
                    onClick={() => setMode("tutor")}
                    className={cn(
                      "relative z-10 px-3 py-1 text-xs font-medium transition-colors duration-200 flex items-center gap-1.5",
                      mode === "tutor" ? "text-emerald-700" : "text-zinc-500 hover:text-zinc-900"
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
