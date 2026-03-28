import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { type ChatMode } from "@/components/chat-types";

function buildDiagnosisFallback(mode: ChatMode, originalProblem: string, note: string) {
  if (mode === "solver") {
    return `# What Looks Right
- I could not fully inspect the work, so start by checking which steps already match the original problem.

# What To Double-Check
- Look for the first line where a number, sign, or operation changes unexpectedly.
- Compare each written step against the original problem rather than only checking the final answer.

# A Better Next Step
- Rework the first step that looks different from the original plan.

# What To Say Next
- Start with: "Let's find the first step that changed in a way we didn't mean."
- ${note ? `Keep this note in mind too: ${note}` : "Ask your child to explain each step out loud while checking the work."}`;
  }

  return `# What Looks Right
- I could not fully inspect the work, so begin with the parts your child already seems to understand.

# What To Check Next
- Point to the first step that looks different from the original plan and ask what rule was used there.

# What To Say Next
- Start with: "Show me what this step means before we change anything."
- ${note ? `Keep this note in mind too: ${note}` : "Keep the correction short and focus on one idea at a time."}

# Quick Check
- Ask your child to solve one tiny similar step before redoing the whole problem.

# Original Problem
${originalProblem}`;
}

function buildDiagnosisPrompt({
  mode,
  originalProblem,
  priorAnswer,
  note,
}: {
  mode: ChatMode;
  originalProblem: string;
  priorAnswer: string;
  note: string;
}) {
  const modeInstruction =
    mode === "solver"
      ? `Return this exact structure:
# What Looks Right
- [1-3 reassuring bullets about steps that are correct or likely correct]

# What To Double-Check
- [short bullets that identify the first wrong step or the next thing to inspect]

# A Better Next Step
- [show the corrected move briefly, or say the work shown looks correct if no mistake is visible]

# What To Say Next
- [2-3 short parent-friendly bullets]`
      : `Return this exact structure:
# What Looks Right
- [1-3 reassuring bullets about what the child seems to understand]

# What To Check Next
- [1-3 short bullets about the likely misunderstanding or next area to inspect]

# What To Say Next
- [2-3 short parent-friendly bullets]

# Quick Check
- [1-2 short bullets or one tiny check question]`;

  return `You are reviewing a child’s handwritten math work for a parent.

Mode:
${mode}

Original problem:
${originalProblem}

Existing app answer:
${priorAnswer || "None"}

Parent note:
${note || "None"}

Instructions:
- Read the image as the child’s actual work.
- Start by naming what looks correct before pointing out any issue.
- If the work looks correct, say that clearly and do not force a mistake.
- Focus on the first useful next check, not a long essay.
- If the image is unclear, say that clearly and still give the parent the best next checking step.
- Keep the language calm, short, and useful in a live homework moment.
- Do not mention AI, OCR, model, or technical limitations except to say the image is unclear if needed.
- Use $...$ for inline math expressions like $(7 - x)^2$ or $x^2 - 7x + 12$.
- Use $$...$$ for standalone equations or corrected steps.
- Never leave exponents, equations, or symbolic expressions as plain text if math formatting would help clarity.

${modeInstruction}`;
}

export async function POST(req: Request) {
  try {
    const { mode, originalProblem, priorAnswer, childWorkImage, note } = (await req.json()) as {
      mode: ChatMode;
      originalProblem?: string;
      priorAnswer?: string;
      childWorkImage?: string;
      note?: string;
    };

    if (!mode) {
      return NextResponse.json({ error: "Mode is required." }, { status: 400 });
    }

    const normalizedProblem =
      typeof originalProblem === "string" && originalProblem.trim()
        ? originalProblem.trim()
        : "Review the child’s work shown here.";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        diagnosis: buildDiagnosisFallback(mode, normalizedProblem, note || ""),
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [
      {
        text: buildDiagnosisPrompt({
          mode,
          originalProblem: normalizedProblem,
          priorAnswer: priorAnswer || "",
          note: note || "",
        }),
      },
    ];

    if (childWorkImage) {
      const base64Data = childWorkImage.split(",")[1];
      const mimeType = childWorkImage.split(";")[0]?.split(":")[1] || "image/png";
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [
        {
          role: "user",
          parts,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      diagnosis: response.text?.trim() || buildDiagnosisFallback(mode, normalizedProblem, note || ""),
    });
  } catch (error: any) {
    console.error("Diagnosis route error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to diagnose the child’s mistake." },
      { status: 500 }
    );
  }
}
