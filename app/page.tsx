"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Menu } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { PromptInput } from "@/components/prompt-input";
import { type PracticeProblem } from "@/components/practice-module";
import { ChatEmptyState } from "@/components/chat-empty-state";
import { ChatMessageItem } from "@/components/chat-message-item";
import { getMarkdownComponents } from "@/components/chat-markdown-components";
import { type ChatMode, type Message } from "@/components/chat-types";

export default function Page() {
  const [mode, setMode] = useState<ChatMode>("solver");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const markdownComponents = useMemo(() => getMarkdownComponents(), []);

  const scrollToBottom = (force = false) => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (force || scrollHeight - scrollTop - clientHeight < 150) {
        scrollContainerRef.current.scrollTop = scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setImageFromFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (acceptedFiles: File[]) => {
    setImageFromFile(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    noClick: true,
    noKeyboard: true,
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageFromFile(e.target.files?.[0]);
  };

  const generatePracticeProblem = async (originalProblemText: string): Promise<PracticeProblem | null> => {
    try {
      const response = await fetch("/api/generate-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalProblem: originalProblemText }),
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("Error generating practice problem:", error);
      return null;
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      text: input,
      image: selectedImage || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSelectedImage(null);
    setIsLoading(true);
    setTimeout(() => scrollToBottom(true), 50);

    const modelMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: modelMessageId, role: "model", text: "", isStreaming: true },
    ]);

    try {
      const shouldUseMathSolveRoute = mode === "solver" && !selectedImage && Boolean(userMessage.text.trim());
      if (shouldUseMathSolveRoute) {
        const solveResponse = await fetch("/api/math/solve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problem: userMessage.text,
            userQuery: userMessage.text,
          }),
        });

        if (!solveResponse.ok) {
          throw new Error("Failed to solve with symbolic route");
        }

        const solvePayload = await solveResponse.json();
        const fullText =
          typeof solvePayload?.solution === "string" && solvePayload.solution.trim()
            ? solvePayload.solution
            : "I could not produce a symbolic solution for this problem.";
        const symbolic = solvePayload?.symbolic
          ? {
              problemType: solvePayload.symbolic.problemType,
              deterministicPath: solvePayload.symbolic.deterministicPath,
              classifierConfidence: solvePayload.symbolic.classifierConfidence,
              requiredValues: solvePayload.symbolic.requiredValues,
              missingValues: solvePayload.symbolic.missingValues,
              extractedParameters: solvePayload.symbolic.extractedParameters,
              parameterConfidence: solvePayload.symbolic.parameterConfidence,
              ambiguitySignals: solvePayload.symbolic.ambiguitySignals,
              qualityScore: solvePayload.symbolic.qualityScore,
              qualityBreakdown: solvePayload.symbolic.qualityBreakdown,
              canExecuteDeterministic: solvePayload.symbolic.canExecuteDeterministic,
              blockingReason: solvePayload.symbolic.blockingReason,
              blockingRetryHint: solvePayload.symbolic.blockingRetryHint,
              code: solvePayload.symbolic.code,
              output: solvePayload.symbolic.output,
              error: solvePayload.symbolic.error,
              errorCode: solvePayload.symbolic.errorCode,
              retryHint: solvePayload.symbolic.retryHint,
              runtime: solvePayload.symbolic.runtime,
              status:
                solvePayload.symbolic.status ??
                (solvePayload.symbolic.error ? "error" : solvePayload.success ? "completed" : "error"),
            }
          : undefined;
        setMessages((prev) =>
          prev.map((msg) => (msg.id === modelMessageId ? { ...msg, text: fullText, symbolic } : msg))
        );
      } else {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [...messages, userMessage], mode }),
        });

        if (!response.ok || !response.body) throw new Error("Network response was not ok");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((msg) => (msg.id === modelMessageId ? { ...msg, text: fullText } : msg))
          );
        }
      }

      setMessages((prev) =>
        prev.map((msg) => (msg.id === modelMessageId ? { ...msg, isStreaming: false } : msg))
      );
    } catch (error) {
      console.error("Error generating response:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId
            ? { ...msg, text: "Sorry, I encountered an error while solving this problem. Please try again.", isStreaming: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowExplanation = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, isExplanationVisible: true } : msg))
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-white overflow-hidden" {...getRootProps()}>
      <input {...getInputProps()} />
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageUpload}
      />
      <header className="flex-none h-14 px-4 flex items-center justify-between border-b border-zinc-100 bg-white">
        <button className="md:hidden p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-3 ml-auto">
          <button className="px-3 py-1.5 rounded-full bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors">
            Upgrade
          </button>
          <button className="px-3 py-1.5 rounded-full border border-zinc-200 text-xs font-medium hover:bg-zinc-50 transition-colors text-zinc-700">
            Log In
          </button>
        </div>
      </header>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 px-4 md:px-8 scroll-smooth">
        <div className="max-w-4xl mx-auto w-full h-full flex flex-col py-6">
          {messages.length === 0 ? (
            <ChatEmptyState />
          ) : (
            <div className="flex flex-col gap-8 pb-2">
              {messages.map((message) => (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  mode={mode}
                  markdownComponents={markdownComponents}
                  onGeneratePractice={generatePracticeProblem}
                  onShowExplanation={handleShowExplanation}
                />
              ))}
              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </div>
      </div>

      <div className="flex-none bg-white pb-6 pt-2">
        <PromptInput
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          selectedImage={selectedImage}
          setSelectedImage={setSelectedImage}
          onImageUpload={() => fileInputRef.current?.click()}
          mode={mode}
          setMode={setMode}
        />
      </div>
    </div>
  );
}
