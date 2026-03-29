"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Menu } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { PromptInput } from "@/components/prompt-input";
import { type PracticeProblem } from "@/components/practice-module";
import { ChatEmptyState } from "@/components/chat-empty-state";
import { ChatMessageItem } from "@/components/chat-message-item";
import { getMarkdownComponents } from "@/components/chat-markdown-components";
import { type ChatMode, type DraftImageIntent, type Message, type MessageActionType } from "@/components/chat-types";

const imageIntentProblemByMode: Record<ChatMode, string> = {
  solver: "Solve the homework shown in the uploaded image.",
  tutor: "Explain the homework shown in the uploaded image to a parent.",
};

const followUpActionConfig: Record<
  Exclude<MessageActionType, "create_similar_practice">,
  { label: string; userText: string; followUpIntent: string }
> = {
  solver_another_method: {
    label: "Show another method",
    userText: "Show another method.",
    followUpIntent: "Show another valid classroom-friendly method for the same problem.",
  },
  solver_verify_answer: {
    label: "Verify the final answer",
    userText: "Verify the final answer.",
    followUpIntent: "Check the final answer against the original problem and correct anything that is off.",
  },
  solver_break_down_step: {
    label: "Break down one step",
    userText: "Break down one step more clearly.",
    followUpIntent: "Break down the trickiest step into smaller child-friendly moves.",
  },
  tutor_another_analogy: {
    label: "Give another analogy",
    userText: "Give another analogy.",
    followUpIntent: "Give a different analogy the parent can use to explain the concept.",
  },
  tutor_shorten_explanation: {
    label: "Shorten the script",
    userText: "Shorten the explanation.",
    followUpIntent: "Rewrite the teaching explanation as a shorter parent script for a live homework moment.",
  },
  tutor_adjust_language: {
    label: "Use simpler language",
    userText: "Use simpler language.",
    followUpIntent: "Adjust the explanation for slightly younger, simpler child-friendly language.",
  },
  tutor_help_stuck_step: {
    label: "Help with a stuck step",
    userText: "Help with a stuck step.",
    followUpIntent: "Focus on what the parent should say when the child gets stuck on one step.",
  },
};

function buildMessageActions(targetMode: ChatMode, canCreatePractice: boolean) {
  const followUps =
    targetMode === "solver"
      ? [
          { type: "solver_another_method" as const, label: followUpActionConfig.solver_another_method.label },
          { type: "solver_verify_answer" as const, label: followUpActionConfig.solver_verify_answer.label },
          { type: "solver_break_down_step" as const, label: followUpActionConfig.solver_break_down_step.label },
        ]
      : [
          { type: "tutor_another_analogy" as const, label: followUpActionConfig.tutor_another_analogy.label },
          { type: "tutor_shorten_explanation" as const, label: followUpActionConfig.tutor_shorten_explanation.label },
          { type: "tutor_adjust_language" as const, label: followUpActionConfig.tutor_adjust_language.label },
          { type: "tutor_help_stuck_step" as const, label: followUpActionConfig.tutor_help_stuck_step.label },
        ];

  return canCreatePractice
    ? [...followUps, { type: "create_similar_practice" as const, label: "Create similar practice" }]
    : followUps;
}

function extractMarkdownSection(text: string, heading: string) {
  const normalized = text.replace(/\r\n/g, "\n");
  const match = normalized.match(new RegExp(`(^|\\n)#\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([\\s\\S]*?)(?=\\n#\\s+|$)`, "i"));
  return match?.[2]?.trim() || "";
}

function getDraftImageIntent(mode: ChatMode, diagnoseEnabled: boolean): DraftImageIntent {
  if (diagnoseEnabled) return "diagnose_from_image";
  return mode === "solver" ? "solve_from_image" : "teach_from_image";
}

function getFollowUpConfigByUserText(userText: string, mode: ChatMode) {
  const entries = Object.entries(followUpActionConfig).filter(([actionType]) =>
    mode === "solver" ? actionType.startsWith("solver_") : actionType.startsWith("tutor_")
  ) as Array<[Exclude<MessageActionType, "create_similar_practice">, (typeof followUpActionConfig)[Exclude<MessageActionType, "create_similar_practice">]]>;

  return entries.find(([, config]) => config.userText === userText)?.[1];
}

export default function Page() {
  const [mode, setMode] = useState<ChatMode>("solver");
  const [solverMessages, setSolverMessages] = useState<Message[]>([]);
  const [tutorMessages, setTutorMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageIntent, setSelectedImageIntent] = useState<DraftImageIntent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [diagnoseEnabled, setDiagnoseEnabled] = useState(false);
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (!selectedImage) {
      setSelectedImageIntent(null);
      return;
    }

    setSelectedImageIntent(getDraftImageIntent(mode, diagnoseEnabled));
  }, [selectedImage, mode, diagnoseEnabled]);

  const updateMessagesForMode = (targetMode: ChatMode, updater: (messages: Message[]) => Message[]) => {
    if (targetMode === "solver") {
      setSolverMessages(updater);
      return;
    }

    setTutorMessages(updater);
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setSelectedImageIntent(null);
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
    e.target.value = "";
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
    clearSelectedImage();
    setDiagnoseEnabled(false);
  };

  const openImageUpload = () => uploadInputRef.current?.click();

  const openCameraCapture = () => cameraInputRef.current?.click();

  const getMessagesForMode = (targetMode: ChatMode) => (targetMode === "solver" ? solverMessages : tutorMessages);

  const getLatestSourceProblem = (messages: Message[], fallback: string) =>
    [...messages].reverse().find((message) => typeof message.sourceProblem === "string" && message.sourceProblem.trim())?.sourceProblem ||
    fallback;

  const requestStructuredResponse = async ({
    targetMode,
    sessionMessages,
    modelMessageId,
    sourceProblem,
    userQuery,
    image,
    priorAnswer = "",
    followUpIntent = "",
    canCreatePractice,
  }: {
    targetMode: ChatMode;
    sessionMessages: Message[];
    modelMessageId: string;
    sourceProblem: string;
    userQuery: string;
    image?: string | null;
    priorAnswer?: string;
    followUpIntent?: string;
    canCreatePractice: boolean;
  }) => {
    const solveResponse = await fetch("/api/math/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problem: sourceProblem,
        userQuery,
        mode: targetMode,
        image,
        priorAnswer,
        followUpIntent,
        history: sessionMessages.slice(-6).map((message) => ({
          role: message.role,
          text: message.text,
          responseType: message.responseType,
          image: Boolean(message.image),
        })),
      }),
    });

    if (!solveResponse.ok) {
      throw new Error("Failed to generate a structured math response");
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
    const extractedQuestion = extractMarkdownSection(fullText, "Question");
    const resolvedSourceProblem =
      sourceProblem === imageIntentProblemByMode[targetMode] && extractedQuestion ? extractedQuestion : sourceProblem;

    updateMessagesForMode(targetMode, (prev) =>
      prev.map((msg) =>
        msg.id === modelMessageId
          ? {
              ...msg,
              text: fullText,
              teachingMeta,
              diagnosisResult: undefined,
              sourceProblem: resolvedSourceProblem || msg.sourceProblem,
              actions: buildMessageActions(
                targetMode,
                canCreatePractice && resolvedSourceProblem !== imageIntentProblemByMode[targetMode]
              ),
            }
          : msg
      )
    );
  };

  const requestDiagnosisResponse = async ({
    targetMode,
    modelMessageId,
    originalProblem,
    priorAnswer,
    childWorkImage,
    note,
  }: {
    targetMode: ChatMode;
    modelMessageId: string;
    originalProblem: string;
    priorAnswer: string;
    childWorkImage?: string | null;
    note: string;
  }) => {
    const response = await fetch("/api/math/diagnose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: targetMode,
        originalProblem,
        priorAnswer,
        childWorkImage,
        note,
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

    updateMessagesForMode(targetMode, (prev) =>
      prev.map((msg) =>
        msg.id === modelMessageId
          ? {
              ...msg,
              responseType: "diagnosis_response",
              text: diagnosisText,
              sourceProblem: originalProblem || msg.sourceProblem,
              diagnosisResult: payload?.result,
              actions: undefined,
            }
          : msg
      )
    );
  };

  const copyMessageToClipboard = async (message: Message) => {
    const content = message.text.trim();
    if (!content) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = content;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopiedMessageId(message.id);
      window.setTimeout(() => {
        setCopiedMessageId((current) => (current === message.id ? null : current));
      }, 1800);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  };

  const handleMessageAction = async (message: Message, actionType: MessageActionType) => {
    if (actionType === "create_similar_practice") {
      handleShowPractice(message.id, message.mode);
      return;
    }

    if (isLoading) return;

    const actionConfig = followUpActionConfig[actionType];
    const targetMode = message.mode;
    const sessionMessages = getMessagesForMode(targetMode);
    const sourceProblem =
      message.sourceProblem || getLatestSourceProblem(sessionMessages, imageIntentProblemByMode[targetMode]);
    const canCreatePractice = sourceProblem !== imageIntentProblemByMode[targetMode];
    const userMessageId = Date.now().toString();
    const modelMessageId = (Date.now() + 1).toString();
    const actionKey = `${message.id}:${actionType}`;
    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      mode: targetMode,
      responseType: "user_input",
      text: actionConfig.userText,
      sourceProblem,
      requestInput: actionConfig.userText,
    };

    setIsLoading(true);
    setActiveActionKey(actionKey);
    updateMessagesForMode(targetMode, (prev) => [
      ...prev,
      userMessage,
      {
        id: modelMessageId,
        role: "model",
        mode: targetMode,
        responseType: targetMode === "solver" ? "solver_response" : "tutor_response",
        text: "",
        isStreaming: true,
        sourceProblem,
      },
    ]);
    setTimeout(() => scrollToBottom(true), 50);

    try {
      await requestStructuredResponse({
        targetMode,
        sessionMessages,
        modelMessageId,
        sourceProblem,
        userQuery: actionConfig.userText,
        priorAnswer: message.text,
        followUpIntent: actionConfig.followUpIntent,
        canCreatePractice,
      });
      updateMessagesForMode(targetMode, (prev) =>
        prev.map((msg) => (msg.id === modelMessageId ? { ...msg, isStreaming: false } : msg))
      );
    } catch (error) {
      console.error("Error running follow-up action:", error);
      updateMessagesForMode(targetMode, (prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId
            ? {
                ...msg,
                text: "Sorry, I hit a problem while handling that follow-up. Please try again.",
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setActiveActionKey(null);
    }
  };

  const handleRetryMessage = async (message: Message) => {
    if (isLoading || message.role !== "model") return;

    const sessionMessages = getMessagesForMode(message.mode);
    const modelIndex = sessionMessages.findIndex((entry) => entry.id === message.id);
    if (modelIndex < 0) return;

    let userIndex = -1;
    for (let index = modelIndex - 1; index >= 0; index -= 1) {
      if (sessionMessages[index]?.role === "user") {
        userIndex = index;
        break;
      }
    }

    if (userIndex < 0) return;

    const triggeringUser = sessionMessages[userIndex];
    const historyBeforeTurn = sessionMessages.slice(0, userIndex);
    const priorModelAnswer =
      [...historyBeforeTurn].reverse().find((entry) => entry.role === "model" && Boolean(entry.text.trim()))?.text || "";
    const sourceProblem =
      message.sourceProblem ||
      triggeringUser.sourceProblem ||
      getLatestSourceProblem(historyBeforeTurn, imageIntentProblemByMode[message.mode]);
    const retryKey = `retry:${message.id}`;

    setIsLoading(true);
    setActiveActionKey(retryKey);
    updateMessagesForMode(message.mode, (prev) =>
      prev.map((entry) =>
        entry.id === message.id
          ? {
              ...entry,
              text: "",
              isStreaming: true,
              diagnosisResult: undefined,
            }
          : entry
      )
    );

    try {
      if (message.responseType === "diagnosis_response") {
        await requestDiagnosisResponse({
          targetMode: message.mode,
          modelMessageId: message.id,
          originalProblem: sourceProblem,
          priorAnswer: priorModelAnswer,
          childWorkImage: triggeringUser.image,
          note: triggeringUser.requestInput?.trim() || "",
        });
      } else {
        const requestInput = triggeringUser.requestInput?.trim() || triggeringUser.text.trim();
        const followUpConfig = getFollowUpConfigByUserText(requestInput, message.mode);
        const canCreatePractice = sourceProblem !== imageIntentProblemByMode[message.mode];

        await requestStructuredResponse({
          targetMode: message.mode,
          sessionMessages: historyBeforeTurn,
          modelMessageId: message.id,
          sourceProblem,
          userQuery: requestInput || triggeringUser.text,
          image: triggeringUser.image,
          priorAnswer: priorModelAnswer,
          followUpIntent: followUpConfig?.followUpIntent || "",
          canCreatePractice,
        });
      }

      updateMessagesForMode(message.mode, (prev) =>
        prev.map((entry) => (entry.id === message.id ? { ...entry, isStreaming: false } : entry))
      );
    } catch (error) {
      console.error("Error retrying message:", error);
      updateMessagesForMode(message.mode, (prev) =>
        prev.map((entry) =>
          entry.id === message.id
            ? {
                ...entry,
                text: "Sorry, I hit a problem while trying that again. Please retry.",
                isStreaming: false,
              }
            : entry
        )
      );
    } finally {
      setIsLoading(false);
      setActiveActionKey(null);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const currentMode = mode;
    const sessionMessages = getMessagesForMode(currentMode);
    const currentInput = input.trim();
    const currentImage = selectedImage;
    const latestModelAnswer =
      [...sessionMessages]
        .reverse()
        .find((message) => message.role === "model" && Boolean(message.text.trim()))?.text || "";
    const sourceProblemFallback = currentInput || (currentImage ? imageIntentProblemByMode[currentMode] : "");
    const sessionSourceProblem = getLatestSourceProblem(sessionMessages, sourceProblemFallback);
    const canCreatePractice = sessionSourceProblem !== imageIntentProblemByMode[currentMode];
    const userFacingText = diagnoseEnabled
      ? "Please review my child’s work."
      : currentInput || (currentImage ? imageIntentProblemByMode[currentMode] : "");

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      mode: currentMode,
      responseType: "user_input",
      text: userFacingText,
      image: currentImage || undefined,
      sourceProblem: sessionSourceProblem || undefined,
      requestInput: currentInput,
    };

    updateMessagesForMode(currentMode, (prev) => [...prev, userMessage]);
    setInput("");
    clearSelectedImage();
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
          sessionSourceProblem || currentInput || "Review the child’s work shown here.";

        await requestDiagnosisResponse({
          targetMode: currentMode,
          modelMessageId,
          originalProblem: diagnosisOriginalProblem,
          priorAnswer: latestModelAnswer,
          childWorkImage: currentImage,
          note: currentInput,
        });

        return;
      }

      await requestStructuredResponse({
        targetMode: currentMode,
        sessionMessages,
        modelMessageId,
        sourceProblem: sessionSourceProblem,
        userQuery: currentInput || userFacingText,
        image: currentImage,
        priorAnswer: latestModelAnswer,
        canCreatePractice,
      });

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
        ref={uploadInputRef}
        onChange={handleImageUpload}
      />
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={cameraInputRef}
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

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 px-4 md:px-6 scroll-smooth">
        <div className="max-w-4xl mx-auto w-full h-full flex flex-col py-6">
          {activeMessages.length === 0 ? (
            <ChatEmptyState />
          ) : (
            <div className="flex flex-col gap-6 md:gap-7 pb-2">
              {activeMessages.map((message) => (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  markdownComponents={markdownComponents}
                  onGeneratePractice={generatePracticeProblem}
                  onShowExplanation={handleShowExplanation}
                  onRunAction={handleMessageAction}
                  onCopyMessage={copyMessageToClipboard}
                  onRetryMessage={handleRetryMessage}
                  activeActionKey={activeActionKey}
                  copiedMessageId={copiedMessageId}
                />
              ))}
              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </div>
      </div>

      <div className="flex-none bg-white pb-2 pt-2">
        <PromptInput
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          selectedImage={selectedImage}
          selectedImageIntent={selectedImageIntent}
          setSelectedImage={setSelectedImage}
          onClearImage={clearSelectedImage}
          onImageUpload={openImageUpload}
          onTakePhoto={openCameraCapture}
          mode={mode}
          setMode={handleModeChange}
          diagnoseEnabled={diagnoseEnabled}
          setDiagnoseEnabled={setDiagnoseEnabled}
        />
      </div>
    </div>
  );
}
