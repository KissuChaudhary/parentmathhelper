import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export async function POST(req: Request) {
  try {
    const { originalProblem } = await req.json();

    if (!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        problem_latex: "3/4 + 1/8 = ?",
        correct_answer: "7/8",
        parent_hint: "Ask your child what common denominator both fractions can share before adding.",
        success_message: "Great job sticking with a harder homework skill.",
      });
    }

    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY 
    });

    const prompt = `You generate elementary math practice for parents helping children in Grades 3-6.
Create one new practice problem that tests the same skill as the original problem with different numbers.
Keep it classroom-friendly and age-appropriate.
Prioritize fractions, long division, decimals, area vs perimeter, measurement conversions, word problems, and beginning algebra patterns when relevant.
Do not introduce high school concepts, calculus, or symbolic math.
Return a parent hint the adult can say out loud in plain English.

Original Problem: ${originalProblem}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
