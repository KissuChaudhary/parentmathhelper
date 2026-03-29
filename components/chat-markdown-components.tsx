"use client";

import { ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { MathGraph } from "@/components/math-graph";
import { DataChart } from "@/components/data-chart";

export function getMarkdownComponents() {
  return {
    p: ({ node, ...props }: any) => <p className="mb-4 last:mb-0 text-[15px] text-zinc-800 break-words" {...props} />,
    h1: ({ node, children, ...props }: any) => {
      const text = String(children);
      if (text.includes("Answer")) {
        return (
          <h1 className="text-xl font-bold mt-8 mb-4 flex items-center gap-2 text-zinc-900" {...props}>
            <ListChecks size={24} className="text-zinc-900" />
            {children}
          </h1>
        );
      }
      return <h1 className="text-xl font-bold mt-6 mb-4 text-zinc-900" {...props}>{children}</h1>;
    },
    h2: ({ node, ...props }: any) => <h2 className="text-base font-bold mt-8 mb-3 text-zinc-900" {...props} />,
    h3: ({ node, ...props }: any) => <h3 className="text-sm font-semibold mt-4 mb-2 flex items-center gap-2 text-zinc-900" {...props} />,
    ol: ({ node, ...props }: any) => <ol className="custom-ol list-none pl-0 space-y-4 my-4 [counter-reset:step-counter]" {...props} />,
    ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 space-y-2 my-3" {...props} />,
    li: ({ node, ...props }: any) => <li className="text-[15px] text-zinc-800 break-words" {...props} />,
    table: ({ node, ...props }: any) => (
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm text-left text-zinc-600 border border-zinc-200 rounded-lg overflow-hidden" {...props} />
      </div>
    ),
    thead: ({ node, ...props }: any) => <thead className="text-xs text-zinc-700 uppercase bg-zinc-50 border-b border-zinc-200" {...props} />,
    tbody: ({ node, ...props }: any) => <tbody className="divide-y divide-zinc-200" {...props} />,
    tr: ({ node, ...props }: any) => <tr className="bg-white hover:bg-zinc-50 transition-colors" {...props} />,
    th: ({ node, ...props }: any) => <th className="px-4 py-3 font-medium text-zinc-900" {...props} />,
    td: ({ node, ...props }: any) => <td className="px-4 py-3" {...props} />,
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      if (!inline) {
        const text = String(children).replace(/\n$/, "");
        let isGraph = false;
        let isChart = false;
        let data = null;

        if (match && match[1] === "math-graph") {
          isGraph = true;
        } else if (match && match[1] === "data-chart") {
          isChart = true;
        } else {
          try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === "object") {
              if ("expression" in parsed && "domain" in parsed && "points" in parsed) {
                isGraph = true;
                data = parsed;
              } else if ("type" in parsed && "data" in parsed && "xKey" in parsed && "yKeys" in parsed) {
                isChart = true;
                data = parsed;
              }
            }
          } catch {}
        }

        if (isGraph) {
          try {
            if (!data) data = JSON.parse(text);
            return <MathGraph expression={data.expression} domain={data.domain} points={data.points} annotations={data.annotations} />;
          } catch {
            return <code className={className} {...props}>{children}</code>;
          }
        }

        if (isChart) {
          try {
            if (!data) data = JSON.parse(text);
            return <DataChart type={data.type} data={data.data} xKey={data.xKey} yKeys={data.yKeys} colors={data.colors} title={data.title} />;
          } catch {
            return <code className={className} {...props}>{children}</code>;
          }
        }
      }

      return <code className={cn("bg-zinc-100 rounded px-1 py-0.5 text-sm font-mono text-zinc-800", className)} {...props}>{children}</code>;
    },
  };
}
