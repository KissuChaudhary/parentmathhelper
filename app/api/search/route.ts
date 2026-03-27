import { solveMathProblemPayload } from "@/lib/math/solve-payload";

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

    const result = await solveMathProblemPayload({
      problem,
      userQuery: problem,
      mode: "solver",
    });

    if ("error" in result) {
      return new Response(result.error, { status: 400 });
    }

    return new Response(result.solution, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("Search route error:", error);
    return new Response(error?.message || "Search request failed", { status: 500 });
  }
}
