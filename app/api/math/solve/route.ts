import { NextResponse } from "next/server";
import { solveMathProblemPayload as solveMathProblemPayloadCore } from "@/lib/math/solve-payload";

export async function POST(req: Request) {
  try {
    const { problem, userQuery, mode, image, history, priorAnswer, followUpIntent } = await req.json();
    const payload = await solveMathProblemPayloadCore({ problem, userQuery, mode, image, history, priorAnswer, followUpIntent });
    if ("error" in payload && typeof payload.error === "string") {
      return NextResponse.json(payload, { status: 400 });
    }
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("Math solve route error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to solve math problem" },
      { status: 500 }
    );
  }
}
