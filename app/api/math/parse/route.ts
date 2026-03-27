import { NextResponse } from "next/server";
import { buildProblemHash } from "@/lib/cache/math-cache";
import { extractCleanMath } from "@/lib/math/llm-extractor";
import { inferElementaryGradeBand, inferElementarySkill } from "@/lib/math/solve-payload";

export async function POST(req: Request) {
  try {
    const { problem, context } = await req.json();

    if (!problem || typeof problem !== "string") {
      return NextResponse.json({ error: "Problem is required" }, { status: 400 });
    }

    const normalizedProblem = await extractCleanMath(
      problem,
      typeof context === "string" ? context : undefined
    );

    return NextResponse.json({
      success: true,
      hash: buildProblemHash(normalizedProblem),
      parsed: {
        originalProblem: problem,
        normalizedProblem,
        gradeBand: inferElementaryGradeBand(
          `${normalizedProblem} ${typeof context === "string" ? context : ""}`.trim()
        ),
        commonSkill: inferElementarySkill(normalizedProblem),
        scope: "elementary-homework",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to parse problem" },
      { status: 500 }
    );
  }
}
