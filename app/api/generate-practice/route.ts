import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export async function POST(req: Request) {
  try {
    const { originalProblem } = await req.json();

    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
      // Return mock data if no API key
      return NextResponse.json({
        problem_latex: "x^2 - 6x + 9 = 0",
        correct_answer: "x = 3",
        parent_hint: "What number multiplies to 9 and adds to -6?",
        success_message: "Awesome job! You nailed that quadratic equation! 🎉",
      });
    }

    const ai = new GoogleGenAI({ 
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY 
    });

    const prompt = `You are an expert math tutor. Your task is to generate a practice problem that tests the exact same concept as the original problem, but with different numbers.
Do NOT introduce any new curveballs, advanced steps, or different concepts.
For example, if the original problem is solving a quadratic equation by factoring like x^2 - 4x + 4 = 0, the new problem should also be a simple factorable perfect square like x^2 - 6x + 9 = 0.

Original Problem: ${originalProblem}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            problem_latex: {
              type: Type.STRING,
              description: "String representing the new equation in LaTeX format",
            },
            correct_answer: {
              type: Type.STRING,
              description: "String representing the final simplified answer",
            },
            parent_hint: {
              type: Type.STRING,
              description: "A plain-English hint the parent can give the child if they get stuck",
            },
            success_message: {
              type: Type.STRING,
              description: "A fun, encouraging congratulatory message",
            },
          },
          required: ["problem_latex", "correct_answer", "parent_hint", "success_message"],
        },
      },
    });

    const jsonStr = response.text?.trim() || "{}";
    const data = JSON.parse(jsonStr);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error generating practice problem:", error);
    return NextResponse.json(
      { error: "Failed to generate practice problem" },
      { status: 500 }
    );
  }
}
