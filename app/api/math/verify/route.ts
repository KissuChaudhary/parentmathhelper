import { NextResponse } from "next/server";
import { mathInterpreterTool, mathSymbolicSolverTool } from "@/lib/tools/index";

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

    const plan = await mathSymbolicSolverTool({ problem });
    const execution = await mathInterpreterTool({
      title: "verify_expected_answer",
      problemType: plan.problemType,
      code: plan.generatedCode,
      expectedOutput: "exact symbolic output",
    });

    const expectedAnswer =
      typeof body.expectedAnswer === "string" && body.expectedAnswer.trim()
        ? body.expectedAnswer.trim()
        : execution.output;

    const verificationCode = `from sympy import sympify, simplify, FiniteSet
import json
candidate_raw = ${JSON.stringify(claimedAnswer)}
expected_raw = ${JSON.stringify(expectedAnswer || "")}
def normalize(value):
    parsed = sympify(value)
    if isinstance(parsed, (list, tuple, set)):
        return FiniteSet(*parsed)
    return parsed
result = {"verified": False, "candidate": candidate_raw, "expected": expected_raw}
try:
    candidate_expr = normalize(candidate_raw)
    expected_expr = normalize(expected_raw)
    equivalent = bool(candidate_expr == expected_expr)
    if not equivalent:
        try:
            equivalent = bool(simplify(candidate_expr - expected_expr) == 0)
        except Exception:
            equivalent = False
    result["verified"] = equivalent
    result["candidate"] = str(candidate_expr)
    result["expected"] = str(expected_expr)
except Exception as err:
    result["error"] = str(err)
print(json.dumps(result))`;

    const verifyExecution = await mathInterpreterTool({
      title: "verify_claimed_answer",
      problemType: "general_symbolic",
      code: verificationCode,
      expectedOutput: "json verification output",
    });

    let verification: Record<string, unknown> = {
      verified: false,
      error: verifyExecution.error || "Verification failed",
      candidate: claimedAnswer,
      expected: expectedAnswer,
    };

    if (verifyExecution.output) {
      try {
        verification = JSON.parse(verifyExecution.output);
      } catch {
        verification = {
          verified: false,
          error: "Unable to parse verification output",
          raw: verifyExecution.output,
          candidate: claimedAnswer,
          expected: expectedAnswer,
        };
      }
    }

    return NextResponse.json({
      success: true,
      problem,
      symbolic: {
        problemType: plan.problemType,
        code: plan.generatedCode,
        output: execution.output,
        error: execution.error,
      },
      verification,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to verify answer" },
      { status: 500 }
    );
  }
}
