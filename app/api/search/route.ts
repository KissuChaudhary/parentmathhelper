import { GoogleGenAI } from "@google/genai";
import { mathInterpreterTool, mathSymbolicSolverTool } from "@/lib/tools/index";

type SearchPayload = {
  query?: string;
  problem?: string;
  messages?: Array<{ text?: string; role?: string }>;
};

function pickProblem(payload: SearchPayload) {
  if (typeof payload.problem === "string" && payload.problem.trim()) return payload.problem;
  if (typeof payload.query === "string" && payload.query.trim()) return payload.query;
  if (Array.isArray(payload.messages) && payload.messages.length > 0) {
    const last = payload.messages[payload.messages.length - 1];
    if (last?.text?.trim()) return last.text;
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as SearchPayload;
    const problem = pickProblem(payload);

    if (!problem) {
      return new Response("Missing query", { status: 400 });
    }

    const plan = await mathSymbolicSolverTool({ problem });
    const execution = await mathInterpreterTool({
      title: "search_math_solve",
      code: plan.generatedCode,
      problemType: plan.problemType,
      expectedOutput: "exact symbolic output",
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallback = execution.success ? execution.output : execution.error || "Symbolic solve failed";
      return new Response(fallback, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Solve using the exact symbolic result.
Problem: ${problem}
Symbolic output: ${execution.output || "(empty)"}
Symbolic error: ${execution.error || "None"}
Give a concise final answer and short explanation.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
    });

    return new Response(response.text || execution.output, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("Search route error:", error);
    return new Response(error?.message || "Search request failed", { status: 500 });
  }
}
