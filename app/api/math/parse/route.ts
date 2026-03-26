import { NextResponse } from "next/server";
import { buildProblemHash } from "@/lib/cache/math-cache";
import { mathSymbolicSolverTool } from "@/lib/tools/index";

export async function POST(req: Request) {
  try {
    const { problem, context } = await req.json();

    if (!problem || typeof problem !== "string") {
      return NextResponse.json({ error: "Problem is required" }, { status: 400 });
    }

    const parsed = await mathSymbolicSolverTool({
      problem,
      context: typeof context === "string" ? context : undefined,
    });

    return NextResponse.json({
      success: true,
      hash: buildProblemHash(problem),
      parsed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to parse problem" },
      { status: 500 }
    );
  }
}
