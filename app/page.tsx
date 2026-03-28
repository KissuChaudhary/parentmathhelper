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
  const [solverMessages, setSolverMessages] = useState<Message[]>([]);
  const [tutorMessages, setTutorMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [diagnoseEnabled, setDiagnoseEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const markdownComponents = useMemo(() => getMarkdownComponents(), []);
  const activeMessages = mode === "solver" ? solverMessages : tutorMessages;

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
  }, [activeMessages]);

  const updateMessagesForMode = (targetMode: ChatMode, updater: (messages: Message[]) => Message[]) => {
    if (targetMode === "solver") {
      setSolverMessages(updater);
      return;
    }

    setTutorMessages(updater);
  };

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

  const handleModeChange = (nextMode: ChatMode) => {
    if (isLoading || nextMode === mode) return;
    setMode(nextMode);
    setInput("");
    setSelectedImage(null);
    setDiagnoseEnabled(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const currentMode = mode;
    const sessionMessages = currentMode === "solver" ? solverMessages : tutorMessages;
    const currentInput = input;
    const currentImage = selectedImage;
    const latestModelAnswer =
      [...sessionMessages]
        .reverse()
        .find((message) => message.role === "model" && Boolean(message.text.trim()))?.text || "";
    const sessionSourceProblem =
      [...sessionMessages].reverse().find((message) => typeof message.sourceProblem === "string" && message.sourceProblem.trim())
        ?.sourceProblem || currentInput.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      mode: currentMode,
      responseType: "user_input",
      text: diagnoseEnabled ? "Please review my child’s work." : currentInput,
      image: currentImage || undefined,
      sourceProblem: sessionSourceProblem || undefined,
    };

    updateMessagesForMode(currentMode, (prev) => [...prev, userMessage]);
    setInput("");
    setSelectedImage(null);
    setIsLoading(true);
    setTimeout(() => scrollToBottom(true), 50);

    const modelMessageId = (Date.now() + 1).toString();
    updateMessagesForMode(currentMode, (prev) => [
      ...prev,
      {
        id: modelMessageId,
        role: "model",
        mode: currentMode,
        responseType: currentMode === "solver" ? "solver_response" : "tutor_response",
        text: "",
        isStreaming: true,
        sourceProblem: sessionSourceProblem || undefined,
      },
    ]);

    try {
      if (diagnoseEnabled) {
        const diagnosisOriginalProblem =
          sessionSourceProblem || currentInput.trim() || "Review the child’s work shown here.";

        const response = await fetch("/api/math/diagnose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: currentMode,
            originalProblem: diagnosisOriginalProblem,
            priorAnswer: latestModelAnswer,
            childWorkImage: currentImage,
            note: currentInput.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to diagnose child work");
        }

        const payload = await response.json();
        const diagnosisText =
          typeof payload?.diagnosis === "string" && payload.diagnosis.trim()
            ? payload.diagnosis
            : "I could not review the child’s work from that submission.";

        updateMessagesForMode(currentMode, (prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId
              ? {
                  ...msg,
                  responseType: "diagnosis_response",
                  text: diagnosisText,
                  sourceProblem: diagnosisOriginalProblem || msg.sourceProblem,
                }
              : msg
          )
        );

        return;
      }

      const shouldUseMathSolveRoute =
        currentMode === "solver" &&
        !currentImage &&
        Boolean(userMessage.text.trim()) &&
        sessionMessages.length === 0;

      if (shouldUseMathSolveRoute) {
        const solveResponse = await fetch("/api/math/solve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problem: userMessage.text,
            userQuery: userMessage.text,
            mode: currentMode,
          }),
        });

        if (!solveResponse.ok) {
          throw new Error("Failed to solve elementary math problem");
        }

        const solvePayload = await solveResponse.json();
        const fullText =
          typeof solvePayload?.solution === "string" && solvePayload.solution.trim()
            ? solvePayload.solution
            : "I could not produce a parent-friendly math explanation for this problem.";
        const teachingMeta = solvePayload?.metadata
          ? {
              mode: solvePayload.metadata.mode,
              gradeBand: solvePayload.metadata.gradeBand,
              confidence: solvePayload.metadata.confidence,
              validationPassed: solvePayload.metadata.validationPassed,
              commonSkill: solvePayload.metadata.commonSkill,
              hasPractice: solvePayload.metadata.hasPractice,
              status: solvePayload.metadata.status,
              source: solvePayload.metadata.source,
              contentVersion: solvePayload.metadata.contentVersion,
            }
          : undefined;
        updateMessagesForMode(currentMode, (prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId
              ? {
                  ...msg,
                  text: fullText,
                  teachingMeta,
                  sourceProblem: sessionSourceProblem || msg.sourceProblem,
                  actions: sessionSourceProblem
                    ? [{ type: "create_similar_practice", label: "Create similar practice" }]
                    : undefined,
                }
              : msg
          )
        );
      } else {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [...sessionMessages, userMessage], mode: currentMode }),
        });

        if (!response.ok || !response.body) throw new Error("Network response was not ok");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          updateMessagesForMode(currentMode, (prev) =>
            prev.map((msg) => (msg.id === modelMessageId ? { ...msg, text: fullText } : msg))
          );
        }

        updateMessagesForMode(currentMode, (prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId
              ? {
                  ...msg,
                  sourceProblem: sessionSourceProblem || msg.sourceProblem,
                  actions: sessionSourceProblem
                    ? [{ type: "create_similar_practice", label: "Create similar practice" }]
                    : undefined,
                }
              : msg
          )
        );
      }

      updateMessagesForMode(currentMode, (prev) =>
        prev.map((msg) => (msg.id === modelMessageId ? { ...msg, isStreaming: false } : msg))
      );
    } catch (error) {
      console.error("Error generating response:", error);
      updateMessagesForMode(currentMode, (prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId
            ? {
                ...msg,
                text: "Sorry, I encountered an error while solving this problem. Please try again.",
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setDiagnoseEnabled(false);
    }
  };

  const handleShowExplanation = (messageId: string, targetMode: ChatMode) => {
    updateMessagesForMode(targetMode, (prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, isExplanationVisible: true } : msg))
    );
  };

  const handleShowPractice = (messageId: string, targetMode: ChatMode) => {
    updateMessagesForMode(targetMode, (prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, isPracticeVisible: true } : msg))
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
          {activeMessages.length === 0 ? (
            <ChatEmptyState />
          ) : (
            <div className="flex flex-col gap-8 pb-2">
              {activeMessages.map((message) => (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  markdownComponents={markdownComponents}
                  onGeneratePractice={generatePracticeProblem}
                  onShowExplanation={handleShowExplanation}
                  onShowPractice={handleShowPractice}
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
          setMode={handleModeChange}
          diagnoseEnabled={diagnoseEnabled}
          setDiagnoseEnabled={setDiagnoseEnabled}
        />
      </div>
    </div>
  );
}
