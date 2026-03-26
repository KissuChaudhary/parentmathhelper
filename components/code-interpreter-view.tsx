"use client";

import { memo, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Code, Copy, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ExecutionStatus = "running" | "completed" | "error";

interface CodeInterpreterViewProps {
  code: string;
  output?: string;
  error?: string;
  language?: string;
  title?: string;
  status?: ExecutionStatus;
}

const LineNumbers = memo(({ count }: { count: number }) => (
  <div className="hidden sm:block select-none w-8 sm:w-10 flex-shrink-0 border-r border-zinc-200 bg-zinc-100 py-0">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="text-[10px] h-[20px] flex items-center justify-end text-zinc-500 pr-2 font-mono">
        {i + 1}
      </div>
    ))}
  </div>
));
LineNumbers.displayName = "LineNumbers";

const StatusBadge = memo(({ status }: { status: ExecutionStatus }) => {
  if (status === "completed") return null;
  if (status === "error") {
    return (
      <div className="flex items-center gap-1 text-red-600 bg-red-100 px-1.5 py-0.5 rounded-md text-[9px] font-medium">
        <XCircle className="h-2.5 w-2.5" />
        <span className="hidden sm:inline">Error</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100">
      <Loader2 className="h-2.5 w-2.5 animate-spin text-blue-500" />
      <span className="hidden sm:inline text-[9px] font-medium text-blue-600">Running</span>
    </div>
  );
});
StatusBadge.displayName = "StatusBadge";


const OutputBlock = memo(({ output, error }: { output?: string; error?: string }) => {
  if (!output && !error) return null;
  return (
    <div
      className={cn(
        "font-mono text-[11px] sm:text-xs leading-[20px] py-2 px-2 sm:px-3",
        error ? "bg-red-50 text-red-700 border border-red-200" : "bg-zinc-100 text-zinc-700"
      )}
    >
      {error ? (
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <pre className="whitespace-pre-wrap overflow-x-auto flex-1">{error}</pre>
        </div>
      ) : (
        <pre className="whitespace-pre-wrap overflow-x-auto">
          <span className="text-zinc-500">→ </span>
          {output}
        </pre>
      )}
    </div>
  );
});
OutputBlock.displayName = "OutputBlock";

export function CodeInterpreterView({
  code,
  output,
  error,
  language = "python",
  title = "Code Execution",
  status = "completed",
}: CodeInterpreterViewProps) {
  const [isExpanded, setIsExpanded] = useState(status === "running");
  const [isCopied, setIsCopied] = useState(false);
  const lines = code.split("\n");

  useEffect(() => {
    setIsExpanded(status === "running");
  }, [status]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="w-full overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between gap-2 bg-zinc-50 px-3 py-2 border-b border-zinc-200">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600">
            <Code className="h-3.5 w-3.5" />
            <span className="uppercase hidden sm:inline">{language}</span>
          </div>
          <span className="text-[11px] sm:text-xs text-zinc-700 truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <button
            type="button"
            onClick={handleCopy}
            className="h-6 w-6 p-0 rounded-md hover:bg-zinc-200 flex items-center justify-center"
            title="Copy code"
          >
            <Copy className={cn("h-3 w-3", isCopied ? "text-green-600" : "text-zinc-500")} />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="h-6 w-6 p-0 rounded-md hover:bg-zinc-200 flex items-center justify-center"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform text-zinc-500", isExpanded ? "rotate-180" : "")} />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div>
          <div className="flex bg-zinc-50 border-b border-zinc-200">
            <LineNumbers count={lines.length} />
            <div className="overflow-x-auto w-full">
              <pre className="py-0 px-2 sm:px-3 m-0 font-mono text-[11px] sm:text-xs leading-[20px] text-zinc-800">{code}</pre>
            </div>
          </div>
          {(output || error) && (
            <>
              <div className="text-[10px] font-mono px-3 py-1 text-zinc-500 bg-zinc-50">EXECUTION RESULT</div>
              <OutputBlock output={output} error={error} />
            </>
          )}
          {status === "running" && !output && !error && (
            <div className="flex items-center justify-center gap-2 py-4 text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Executing code in sandbox...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="px-3 py-2 text-[11px] text-zinc-600">
          {status === "completed" && output && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <code className="font-mono">{output.substring(0, 60)}</code>
              {output.length > 60 ? "..." : ""}
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-3 w-3" />
              <span>Execution error - click to view</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
