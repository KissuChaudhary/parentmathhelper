"use client";

import { useState, useRef, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Image as ImageIcon, 
  Camera, 
  Calculator, 
  ArrowUp, 
  X, 
  UploadCloud,
  Loader2,
  Bot,
  User,
  ChevronRight,
  ChevronDown,
  FlaskConical,
  Dna,
  Briefcase,
  Globe2,
  FunctionSquare,
  Menu,
  MoreHorizontal,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCcw,
  ListChecks,
  Zap,
  BrainCircuit
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { PromptInput } from "@/components/prompt-input";
import { MathGraph } from "@/components/math-graph";
import { DataChart } from "@/components/data-chart";
import { PracticeModule, type PracticeProblem } from "@/components/practice-module";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

type Message = {
  id: string;
  role: "user" | "model";
  text: string;
  image?: string; // base64
  isStreaming?: boolean;
  isExplanationVisible?: boolean;
};

export default function Page() {
  const [mode, setMode] = useState<"solver" | "tutor">("solver");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-4 last:mb-0 text-[15px] text-zinc-800" {...props} />,
    h1: ({node, children, ...props}: any) => {
      const text = String(children);
      if (text.includes('Answer')) {
        return (
          <h1 className="text-xl font-bold mt-8 mb-4 flex items-center gap-2 text-zinc-900" {...props}>
            <ListChecks size={24} className="text-zinc-900" />
            {children}
          </h1>
        );
      }
      return <h1 className="text-xl font-bold mt-6 mb-4 text-zinc-900" {...props}>{children}</h1>;
    },
    h2: ({node, ...props}: any) => <h2 className="text-base font-bold mt-8 mb-3 text-zinc-900" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-sm font-semibold mt-4 mb-2 flex items-center gap-2 text-zinc-900" {...props} />,
    ol: ({node, ...props}: any) => <ol className="custom-ol list-none pl-0 space-y-4 my-4 [counter-reset:step-counter]" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 space-y-2 my-3" {...props} />,
    li: ({node, ...props}: any) => <li className="text-[15px] text-zinc-800" {...props} />,
    table: ({node, ...props}: any) => (
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm text-left text-zinc-600 border border-zinc-200 rounded-lg overflow-hidden" {...props} />
      </div>
    ),
    thead: ({node, ...props}: any) => <thead className="text-xs text-zinc-700 uppercase bg-zinc-50 border-b border-zinc-200" {...props} />,
    tbody: ({node, ...props}: any) => <tbody className="divide-y divide-zinc-200" {...props} />,
    tr: ({node, ...props}: any) => <tr className="bg-white hover:bg-zinc-50 transition-colors" {...props} />,
    th: ({node, ...props}: any) => <th className="px-4 py-3 font-medium text-zinc-900" {...props} />,
    td: ({node, ...props}: any) => <td className="px-4 py-3" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
      const match = /language-(\w+)/.exec(className || '');
      if (!inline) {
        const text = String(children).replace(/\n$/, '');
        let isGraph = false;
        let isChart = false;
        let data = null;

        if (match && match[1] === 'math-graph') {
          isGraph = true;
        } else if (match && match[1] === 'data-chart') {
          isChart = true;
        } else {
          try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === 'object') {
              if ('expression' in parsed && 'domain' in parsed && 'points' in parsed) {
                isGraph = true;
                data = parsed;
              } else if ('type' in parsed && 'data' in parsed && 'xKey' in parsed && 'yKeys' in parsed) {
                isChart = true;
                data = parsed;
              }
            }
          } catch (e) {
            // Not a valid JSON graph or chart
          }
        }

        if (isGraph) {
          try {
            if (!data) data = JSON.parse(text);
            return <MathGraph expression={data.expression} domain={data.domain} points={data.points} annotations={data.annotations} />;
          } catch (e) {
            return <code className={className} {...props}>{children}</code>;
          }
        }

        if (isChart) {
          try {
            if (!data) data = JSON.parse(text);
            return <DataChart type={data.type} data={data.data} xKey={data.xKey} yKeys={data.yKeys} colors={data.colors} title={data.title} />;
          } catch (e) {
            return <code className={className} {...props}>{children}</code>;
          }
        }
      }
      return <code className={cn("bg-zinc-100 rounded px-1 py-0.5 text-sm font-mono text-zinc-800", className)} {...props}>{children}</code>;
    },
  };

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

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'image/*': [] },
    noClick: true,
    noKeyboard: true
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePracticeProblem = async (originalProblemText: string): Promise<PracticeProblem | null> => {
    try {
      const prompt = `Generate a practice problem based on this original problem:
"${originalProblemText}"

Constraint: The new problem must test the exact same concept but use different numbers. It must NOT introduce any new curveballs or advanced steps. (e.g., If the original was x^2 - 4x + 4, the practice problem should be something like x^2 - 6x + 9).

You MUST return a strict JSON object (no markdown formatting outside of the JSON). The JSON schema must be:
{
  "problem_latex": "String representing the new equation",
  "correct_answer": "String representing the final simplified answer",
  "parent_hint": "A plain-English hint the parent can give the child if they get stuck",
  "success_message": "A fun, encouraging congratulatory message"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      if (text) {
        return JSON.parse(text) as PracticeProblem;
      }
      return null;
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
      const apiHistory = messages.map(msg => {
        const msgParts: any[] = [];
        if (msg.image) {
          const base64Data = msg.image.split(",")[1];
          const mimeType = msg.image.split(";")[0].split(":")[1];
          msgParts.push({
            inlineData: { data: base64Data, mimeType: mimeType }
          });
        }
        if (msg.text) {
          msgParts.push({ text: msg.text });
        }
        return { role: msg.role, parts: msgParts };
      }).filter(msg => msg.parts.length > 0);

      const currentParts: any[] = [];
      if (userMessage.image) {
        const base64Data = userMessage.image.split(",")[1];
        const mimeType = userMessage.image.split(";")[0].split(":")[1];
        currentParts.push({
          inlineData: { data: base64Data, mimeType: mimeType },
        });
      }
      
      if (userMessage.text) {
        currentParts.push({ text: userMessage.text });
      }

      const contents = [...apiHistory, { role: "user", parts: currentParts }];

      const solverInstruction = `You are an expert AI math solver. Provide clear, step-by-step explanations for math problems. Use LaTeX formatting for all mathematical expressions and equations. Wrap inline math in single dollar signs ($...$) and block math in double dollar signs ($$...$$).

If the user asks a conversational question (like "Hi", "Hello", "How are you?"), respond naturally without using the math template.

If the user asks a math problem, structure your response EXACTLY as follows:

# Question
[Restate the math problem]

# Answer
[Final Answer]

# Solution
[Concise mathematical steps without long text explanations. Only equations and very brief connecting words like "Combine like terms:" or "Divide by 2:"]
[Strict Math Formatting: Never output run-on math equations. Every distinct logical mathematical step MUST have a strict line break (\`\\n\\n\`) and be isolated on its own line for visual clarity. Use block math \`$$\` for distinct equations.]
[If visualizing a function or equation would be helpful, you MUST include an interactive graph here by outputting a JSON block with the language \`math-graph\`. For example:
\`\`\`math-graph
{
  "expression": "x^2 - 4",
  "domain": [-10, 10],
  "points": 100
}
\`\`\`]
[If presenting data, comparisons, or statistics, you MUST include an interactive chart here by outputting a JSON block with the language \`data-chart\`. Supported types: bar, line, pie. For example:
\`\`\`data-chart
{
  "type": "bar",
  "title": "Plant Growth",
  "data": [{"name": "Snake Plant", "growth": 2}, {"name": "Ficus", "growth": 5}],
  "xKey": "name",
  "yKeys": ["growth"]
}
\`\`\`]

# Explanation
[Detailed text explanation of the steps, concepts, and why we do them. Use bullet points or numbered lists if helpful.]

Do not include any other text outside this structure for math problems.`;

      const tutorInstruction = `You are a patient, empathetic math teacher coaching a parent on how to explain this concept to their child.

If the user asks a conversational question (like "Hi", "Hello", "How are you?"), respond naturally without using the math template.

If the user asks a math problem, follow these rules strictly:
1. The "Why" Before the "How": Before doing any math, provide a 1-2 sentence "Plain English Translation" of what the problem is actually asking.
2. Analogy First: For abstract concepts (like vertex, asymptotes, or common denominators), provide a real-world physical analogy before showing the formula.
3. Parent Coaching Notes: Wrap specific tips for the parent in a blockquote or bold text, like: "> 💡 Teaching Tip: Ask them what happens if you group the numbers together first before moving on to the next step."
4. Strict Math Formatting: Never output run-on math equations. Every distinct logical mathematical step MUST have a strict line break (\`\\n\\n\`) and be isolated on its own line for visual clarity. Use LaTeX formatting for all mathematical expressions (inline: $...$, block: $$...$$).
5. Structure your response using the following sections:
# Plain English Translation
[1-2 sentences explaining what the problem is asking]

# Analogy
[Real-world physical analogy]

# Solution Steps
### Step 1
[Explanation of step 1]
$$ [Math for step 1] $$
> 💡 Teaching Tip: [Tip for parent]

### Step 2
[Explanation of step 2]
$$ [Math for step 2] $$
> 💡 Teaching Tip: [Tip for parent]

(Continue for all steps)

6. If visualizing a function or equation would be helpful, you MUST include an interactive graph here by outputting a JSON block with the language \`math-graph\`. For example:
\`\`\`math-graph
{
  "expression": "x^2 - 4",
  "domain": [-10, 10],
  "points": 100,
  "annotations": [{"x": 2, "y": 0, "label": "Root"}, {"x": 0, "y": -4, "label": "Y-Intercept"}]
}
\`\`\`
7. If presenting data, comparisons, or statistics, you MUST include an interactive chart here by outputting a JSON block with the language \`data-chart\`. Supported types: bar, line, pie. For example:
\`\`\`data-chart
{
  "type": "bar",
  "title": "Plant Growth",
  "data": [{"name": "Snake Plant", "growth": 2}, {"name": "Ficus", "growth": 5}],
  "xKey": "name",
  "yKeys": ["growth"]
}
\`\`\`

Do not include any other text outside this structure for math problems.`;

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.1-pro-preview",
        contents: contents,
        config: {
          systemInstruction: mode === "solver" ? solverInstruction : tutorInstruction,
        }
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        fullText += chunk.text;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId
              ? { ...msg, text: fullText }
              : msg
          )
        );
      }
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId
            ? { ...msg, isStreaming: false }
            : msg
        )
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
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
      
      {/* Header */}
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

      {/* Main Content Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0 px-4 md:px-8 scroll-smooth"
      >
        <div className="max-w-4xl mx-auto w-full h-full flex flex-col py-6">
          
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <h1 className="text-3xl font-semibold mb-2 text-zinc-900 tracking-tight">
                How can I help you today?
              </h1>
              <div className="flex flex-wrap justify-center gap-4 mt-8 text-zinc-500">
                <SubjectIcon icon={<FunctionSquare size={16} />} label="Math" />
                <SubjectIcon icon={<Calculator size={16} />} label="Calculus" />
                <SubjectIcon icon={<FlaskConical size={16} />} label="Chemistry" />
                <SubjectIcon icon={<Dna size={16} />} label="Biology" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-8 pb-2">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className="flex flex-col w-full"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {msg.role === "model" ? (
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
                  
                  <div className={cn("w-full text-[15px] leading-relaxed text-zinc-800", msg.role === "user" ? "pl-7" : "pt-2")}>
                    {msg.image && (
                      <div className="mb-3 rounded-lg overflow-hidden border border-zinc-200 inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={msg.image} alt="Uploaded math problem" className="max-w-sm h-auto max-h-64 object-contain bg-zinc-50" />
                      </div>
                    )}
                    
                    {msg.text && (
                      <div className="prose prose-zinc max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-50 prose-pre:border prose-pre:border-zinc-200 prose-pre:text-zinc-800 prose-code:text-zinc-800 prose-code:bg-zinc-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none [&_.custom-ol>li]:relative [&_.custom-ol>li]:pl-8 [&_.custom-ol>li]:[counter-increment:step-counter] [&_.custom-ol>li]:before:content-[counter(step-counter)] [&_.custom-ol>li]:before:absolute [&_.custom-ol>li]:before:left-0 [&_.custom-ol>li]:before:top-1 [&_.custom-ol>li]:before:flex [&_.custom-ol>li]:before:items-center [&_.custom-ol>li]:before:justify-center [&_.custom-ol>li]:before:w-5 [&_.custom-ol>li]:before:h-5 [&_.custom-ol>li]:before:bg-zinc-200 [&_.custom-ol>li]:before:text-zinc-600 [&_.custom-ol>li]:before:rounded-full [&_.custom-ol>li]:before:text-[11px] [&_.custom-ol>li]:before:font-bold">
                        {(() => {
                          if (mode === "tutor" && msg.text.includes("### Step")) {
                            const parts = msg.text.split(/(?=# Solution Steps)/i);
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
                                    originalText={msg.text}
                                    onGeneratePractice={() => generatePracticeProblem(msg.text)}
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
                                {msg.text.split(/(?=# Explanation)/i)[0]}
                              </ReactMarkdown>

                              <AnimatePresence>
                                {msg.isExplanationVisible && msg.text.match(/(?=# Explanation)/i) && (
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
                                      {msg.text.split(/(?=# Explanation)/i).slice(1).join('')}
                                    </ReactMarkdown>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          );
                        })()}
                      </div>
                    )}
                    
                    {msg.isStreaming && !msg.text && (
                      <div className="flex items-center gap-2 text-zinc-400 py-1">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    )}

                    {msg.role === "model" && !msg.isStreaming && msg.text && (
                      <div className="flex items-center gap-2 mt-4 text-zinc-500">
                        {msg.text.match(/(?=# Explanation)/i) && !msg.isExplanationVisible && (
                          <button 
                            onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isExplanationVisible: true } : m))}
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
              ))}
              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-none bg-white pb-6 pt-2">
        <div className="max-w-3xl mx-auto px-4 mb-3 flex justify-center">
          <div className="bg-zinc-100/80 p-1 rounded-full flex items-center gap-1 border border-zinc-200/50">
            <button
              onClick={() => setMode("solver")}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                mode === "solver"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Zap size={16} className={cn(mode === "solver" ? "text-blue-500" : "text-zinc-400")} />
              Solver
            </button>
            <button
              onClick={() => setMode("tutor")}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                mode === "tutor"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <BrainCircuit size={16} className={cn(mode === "tutor" ? "text-emerald-500" : "text-zinc-400")} />
              Tutor
            </button>
          </div>
        </div>
        <PromptInput 
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          selectedImage={selectedImage}
          setSelectedImage={setSelectedImage}
          onImageUpload={() => fileInputRef.current?.click()}
          mode={mode}
        />
      </div>
    </div>
  );
}

function SubjectIcon({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
      <div className="p-2.5 bg-zinc-50 border border-zinc-100 rounded-xl group-hover:bg-zinc-100 group-hover:border-zinc-200 transition-all">
        <div className="text-zinc-500 group-hover:text-zinc-700 transition-colors">
          {icon}
        </div>
      </div>
      <span className="text-[11px] font-medium text-zinc-500 group-hover:text-zinc-700 transition-colors">{label}</span>
    </div>
  );
}

function TutorSteps({ 
  steps, 
  markdownComponents,
  originalText,
  onGeneratePractice
}: { 
  steps: string[], 
  markdownComponents: any,
  originalText: string,
  onGeneratePractice: () => Promise<PracticeProblem | null>
}) {
  const [openStep, setOpenStep] = useState<number>(0);

  return (
    <div className="flex flex-col gap-3 mt-4">
      {steps.map((step, index) => {
        const lines = step.trim().split('\n');
        const titleLine = lines[0].replace(/^###\s*/, '');
        const content = lines.slice(1).join('\n');
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

      {openStep === steps.length - 1 && (
        <PracticeModule 
          originalProblem={originalText} 
          onGenerate={onGeneratePractice} 
        />
      )}
    </div>
  );
}
