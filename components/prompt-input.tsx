"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Paperclip, 
  ArrowUp, 
  Square, 
  Image as ImageIcon,
  X,
  Globe,
  Lightbulb,
  PenTool
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
}

export function PromptInput({
  input,
  setInput,
  onSubmit,
  isLoading,
  selectedImage,
  setSelectedImage,
  onImageUpload,
  mode
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

  const hasContent = input.trim().length > 0 || selectedImage !== null;

  const gradients = {
    solver: {
      main: {
        topLeft: '#e4e4e7', // zinc-200
        topRight: '#d4d4d8', // zinc-300
        bottomRight: '#a1a1aa', // zinc-400
        bottomLeft: '#d4d4d8', // zinc-300
      },
      outer: {
        topLeft: '#d4d4d8',
        topRight: '#a1a1aa',
        bottomRight: '#71717a',
        bottomLeft: '#a1a1aa',
      }
    },
    tutor: {
      main: {
        topLeft: '#a7f3d0', // emerald-200
        topRight: '#6ee7b7', // emerald-300
        bottomRight: '#34d399', // emerald-400
        bottomLeft: '#6ee7b7', // emerald-300
      },
      outer: {
        topLeft: '#6ee7b7',
        topRight: '#34d399',
        bottomRight: '#10b981',
        bottomLeft: '#34d399',
      }
    }
  };

  const currentMainGradient = gradients[mode].main;
  const currentOuterGradient = gradients[mode].outer;
  const innerGradientOpacity = 0.5;

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <>
      <DrawingCanvas 
        isOpen={isCanvasOpen} 
        onClose={() => setIsCanvasOpen(false)} 
        onSave={(dataUrl) => setSelectedImage(dataUrl)} 
      />
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-4xl mx-auto px-4"
      >
        <div className="relative w-full transition-all duration-300 ease-in-out">
          {/* Outer thin border (0.5px) - darker gradient */}
          <div className={cn(
            "absolute inset-0 rounded-[20px] p-[0.5px] transition-opacity duration-300",
            isFocused ? "opacity-100" : "opacity-60"
          )}
               style={{
                 background: `conic-gradient(from 0deg at 50% 50%,
                   ${currentOuterGradient.topLeft} 0deg,
                   ${currentOuterGradient.topRight} 90deg,
                   ${currentOuterGradient.bottomRight} 180deg,
                   ${currentOuterGradient.bottomLeft} 270deg,
                   ${currentOuterGradient.topLeft} 360deg
                 )`
               }}>
            
            {/* Main thick border (2px) - primary gradient */}
            <div className="h-full w-full rounded-[19.5px] p-[2px]"
                 style={{
                   background: `conic-gradient(from 0deg at 50% 50%,
                     ${currentMainGradient.topLeft} 0deg,
                     ${currentMainGradient.topRight} 90deg,
                     ${currentMainGradient.bottomRight} 180deg,
                     ${currentMainGradient.bottomLeft} 270deg,
                     ${currentMainGradient.topLeft} 360deg
                   )`
                 }}>
              
              {/* Inner container with background */}
              <div className="h-full w-full rounded-[17.5px] bg-white relative">
                
                {/* Inner thin border (0.5px) - configurable opacity darker gradient */}
                <div className="absolute inset-0 rounded-[17.5px] p-[0.5px]"
                     style={{
                       background: `conic-gradient(from 0deg at 50% 50%,
                         ${hexToRgba(currentOuterGradient.topLeft, innerGradientOpacity)} 0deg,
                         ${hexToRgba(currentOuterGradient.topRight, innerGradientOpacity)} 90deg,
                         ${hexToRgba(currentOuterGradient.bottomRight, innerGradientOpacity)} 180deg,
                         ${hexToRgba(currentOuterGradient.bottomLeft, innerGradientOpacity)} 270deg,
                         ${hexToRgba(currentOuterGradient.topLeft, innerGradientOpacity)} 360deg
                       )`
                     }}>
                  <div className="h-full w-full rounded-[17px] bg-white"></div>
                </div>

                {/* Yellow/orange highlight on top edge */}
                <div
                  className="absolute top-0 left-4 right-4 h-[0.5px] bg-gradient-to-r from-transparent via-[var(--top-highlight)]/30 to-transparent"
                  style={{ '--top-highlight': currentMainGradient.topLeft } as React.CSSProperties}
                />

                {/* Darker bottom edge */}
                <div
                  className="absolute bottom-0 left-4 right-4 h-[0.5px] bg-gradient-to-r from-transparent via-[var(--bottom-highlight)]/20 to-transparent"
                  style={{ '--bottom-highlight': currentMainGradient.bottomRight } as React.CSSProperties}
                />
              </div>
            </div>
          </div>

          {/* Actual Content */}
          <div className={cn(
            "relative z-10 flex flex-col w-full rounded-[20px]",
            (selectedImage || input.length > 50) ? "p-3" : "p-1.5"
          )}>
            {/* Top Actions (Canvas) - Only show when focused or has content */}
            <AnimatePresence>
              {(isFocused || hasContent) && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                  animate={{ height: "auto", opacity: 1, marginBottom: 8 }}
                  exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                  className="flex items-center gap-2 overflow-hidden px-2 pt-1.5"
                >
                  <button 
                    onClick={() => setIsCanvasOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100/80 hover:bg-zinc-200 rounded-full transition-colors"
                  >
                    <PenTool size={14} />
                    <span>Canvas</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Image Preview */}
            <AnimatePresence>
              {selectedImage && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative inline-block w-20 h-20 mb-3 ml-2"
                >
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="flex items-end gap-2 px-1">
              {/* Left Actions */}
              <div className="flex items-center gap-1 pb-0.5">
                <button 
                  onClick={onImageUpload}
                  className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors"
                  title="Attach file"
                >
                  <Paperclip size={20} />
                </button>
              </div>

              {/* Textarea */}
              <div className="flex-1 relative min-h-[40px] flex items-center">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Ask anything..."
                  className="w-full max-h-[200px] min-h-[24px] resize-none bg-transparent outline-none py-2.5 px-1 text-[15px] leading-relaxed text-zinc-800 placeholder:text-zinc-400 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                  rows={1}
                />
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-2 pb-0.5">
                <button 
                  onClick={onSubmit}
                  disabled={isLoading}
                  className={cn(
                    "p-2 rounded-full transition-all flex items-center justify-center shadow-sm",
                    isLoading 
                      ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" 
                      : (mode === "tutor" ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 active:scale-95 shadow-emerald-600/20" : "bg-black text-white hover:bg-zinc-800 hover:scale-105 active:scale-95 shadow-black/20")
                  )}
                  title="Send message"
                >
                  {isLoading ? (
                    <Square size={18} className="fill-current animate-pulse" />
                  ) : (
                    <ArrowUp size={18} strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-3">
          <p className="text-xs text-zinc-400">
            AI can make mistakes. Check important info.
          </p>
        </div>
      </motion.div>
    </>
  );
}
