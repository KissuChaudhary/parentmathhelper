import { NextResponse } from "next/server";
import { solveMathProblemPayload, verifyElementaryAnswer } from "@/lib/math/solve-payload";

type VerifyBody = {
  problem?: string;
  claimedAnswer?: string;
  expectedAnswer?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as VerifyBody;
    const problem = typeof body.problem === "string" ? body.problem.trim() : "";
    const claimedAnswer = typeof body.claimedAnswer === "string" ? body.claimedAnswer.trim() : "";

    if (!problem) {
      return NextResponse.json({ error: "Problem is required" }, { status: 400 });
    }

    if (!claimedAnswer) {
      return NextResponse.json({ error: "claimedAnswer is required" }, { status: 400 });
    }

    const expectedAnswer =
      typeof body.expectedAnswer === "string" && body.expectedAnswer.trim()
        ? body.expectedAnswer.trim()
        : "";

    const verification = verifyElementaryAnswer(problem, claimedAnswer, expectedAnswer);
    const solved =
      expectedAnswer || verification.expected
        ? null
        : await solveMathProblemPayload({
            problem,
            userQuery: problem,
            mode: "solver",
          });

    return NextResponse.json({
      success: true,
      problem,
      expectedAnswer:
        expectedAnswer ||
        verification.expected ||
        (!solved || "error" in solved ? "" : solved.solution.match(/# Final Answer\n([\s\S]*?)(\n#|$)/i)?.[1]?.trim() || ""),
      verification,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to verify answer" },
      { status: 500 }
    );
  }
}
