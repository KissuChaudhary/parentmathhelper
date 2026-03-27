import { GoogleGenAI } from "@google/genai";

export async function extractCleanMath(problem: string, context?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return problem.trim();
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      config: {
        systemInstruction: "You clean up elementary math homework questions for caching and routing. Preserve the exact quantities, names, units, and what the child is being asked to find. Remove only filler words, greetings, and repeated conversational text. Do not solve the problem. Do not explain it. Keep the output short, plain, and classroom-friendly.\n\nRules:\n- Preserve word-problem meaning.\n- Preserve grade-level wording when useful.\n- Convert LaTeX to readable plain text.\n- Do not add new numbers or assumptions.\n- Output only the cleaned problem statement.",
        temperature: 0.0,
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${context ? `Context: ${context}\n` : ""}Input: ${problem}`,
            },
          ],
        },
      ],
    });

    const output = response.text?.trim() || problem.trim();
    return output;
  } catch (error) {
    console.error("LLM Extraction failed:", error);
    return problem.trim();
  }
}
