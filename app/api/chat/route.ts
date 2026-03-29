import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { solveMathProblemPayload } from "@/lib/math/solve-payload";
import { mathSolverSystemPrompt } from "@/lib/prompts/math-solver-system";
import { mathTutorSystemPrompt } from "@/lib/prompts/math-user-guide";

export async function POST(req: Request) {
  try {
    const { messages, mode } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    const lastUserMessage = [...messages].reverse().find((msg: any) => msg.role === "user");
    const lastUserText = typeof lastUserMessage?.text === "string" ? lastUserMessage.text.trim() : "";
    const hasImage = Boolean(lastUserMessage?.image);

    if (!apiKey) {
      if (!lastUserText || hasImage) {
        return NextResponse.json({ error: "API key not configured" }, { status: 500 });
      }

      const fallback = await solveMathProblemPayload({
        problem: lastUserText,
        userQuery: lastUserText,
        mode,
      });

      if ("error" in fallback) {
        return NextResponse.json(fallback, { status: 400 });
      }

      return new Response(fallback.solution, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const apiHistory = messages.map((msg: any) => {
      const msgParts: any[] = [];
      if (msg.image) {
        const base64Data = msg.image.split(",")[1];
        const mimeType = msg.image.split(";")[0].split(":")[1];
        msgParts.push({
          inlineData: { data: base64Data, mimeType: mimeType },
        });
      }
      if (msg.text) {
        msgParts.push({ text: msg.text });
      }
      return { role: msg.role, parts: msgParts };
    }).filter((msg: any) => msg.parts.length > 0);

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: apiHistory,
      config: {
        systemInstruction: mode === "solver" ? mathSolverSystemPrompt : mathTutorSystemPrompt,
      },
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          console.error("Stream processing error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    return NextResponse.json({ error: "Failed to process chat request" }, { status: 500 });
  }
}
