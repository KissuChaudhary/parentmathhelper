import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { buildProblemHash, cacheSolution, getCachedSolution } from "@/lib/cache/math-cache";
import { mathInterpreterTool, mathSymbolicSolverTool } from "@/lib/tools/index";

function isLikelyMathQuestion(text: string) {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return false;
  if (/[=+\-*/^]/.test(trimmed)) return true;
  if (/\d/.test(trimmed) && /(solve|factor|simplify|integrate|derivative|differentiate|limit|equation|matrix|determinant|sin|cos|tan|geometry|circle|triangle|cylinder|probability|statistics|mean|median|variance)/.test(trimmed)) return true;
  if (/^\s*(what is|calculate|compute)\s+/.test(trimmed)) return true;
  return false;
}

export async function POST(req: Request) {
  try {
    const { messages, mode } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const apiHistory = messages.map((msg: any) => {
      const msgParts: any[] = [];
      if (msg.image) {
        const base64Data = msg.image.split(",")[1];
        const mimeType = msg.image.split(";")[0].split(":")[1];
        msgParts.push({
          inlineData: { data: base64Data, mimeType: mimeType }
        });
      }
      if (msg.text) {
        msgParts.push({ text: msg.text });
      }
      return { role: msg.role, parts: msgParts };
    }).filter((msg: any) => msg.parts.length > 0);

    const solverInstruction = `You are an expert AI math solver. Provide clear, step-by-step explanations for math problems. Use LaTeX formatting for all mathematical expressions and equations. Wrap inline math in single dollar signs ($...$) and block math in double dollar signs ($$...$$).

If the user asks a conversational question (like "Hi", "Hello", "How are you?"), respond naturally without using the math template.

If the user asks a math problem, structure your response EXACTLY as follows:

# Question
[Restate the math problem]

# Answer
[Final Answer]

# Solution
### Step 1
[One short sentence only]
$$
[Exactly one equation or transformation]
$$

### Step 2
[One short sentence only]
$$
[Exactly one equation or transformation]
$$

[Continue with additional steps. Never put multiple equations in one line. Never chain many equalities in one line.]
[Strict Math Formatting: Every logical step MUST have a strict line break (\`\\n\\n\`) and be isolated on its own line for visual clarity. Use block math \`$$\` for each equation.]
[If visualizing a function or equation would be helpful, you MUST include an interactive graph here by outputting a JSON block with the language \`math-graph\`. For example:
\`\`\`math-graph
{
  "expression": "x^2 - 4",
  "domain": [-10, 10],
  "points": 100
}
\`\`\`]
[If presenting data, comparisons, or statistics, you MUST include an interactive chart here by outputting a JSON block with the language \`data-chart\`. Supported types: bar, line, pie. For example:
\`\`\`data-chart
{
  "type": "bar",
  "title": "Plant Growth",
  "data": [{"name": "Snake Plant", "growth": 2}, {"name": "Ficus", "growth": 5}],
  "xKey": "name",
  "yKeys": ["growth"]
}
\`\`\`]

# Explanation
[Detailed text explanation of the steps, concepts, and why we do them. Use bullet points or numbered lists if helpful.]

Do not include any other text outside this structure for math problems.`;

    const tutorInstruction = `You are a patient, empathetic math teacher coaching a parent on how to explain this concept to their child.

If the user asks a conversational question (like "Hi", "Hello", "How are you?"), respond naturally without using the math template.

If the user asks a math problem, follow these rules strictly:
1. The "Why" Before the "How": Before doing any math, provide a 1-2 sentence "Plain English Translation" of what the problem is actually asking.
2. Analogy First: For abstract concepts (like vertex, asymptotes, or common denominators), provide a real-world physical analogy before showing the formula.
3. Parent Coaching Notes: Wrap specific tips for the parent in a blockquote or bold text, like: "> 💡 Teaching Tip: Ask them what happens if you group the numbers together first before moving on to the next step."
4. Strict Math Formatting: Never output run-on math equations. Every distinct logical mathematical step MUST have a strict line break (\`\\n\\n\`) and be isolated on its own line for visual clarity. Use LaTeX formatting for all mathematical expressions (inline: $...$, block: $$...$$).
4.1 Each step must contain exactly one block equation. Do not place multiple transformed equations on one line.
5. Structure your response using the following sections:
# Plain English Translation
[1-2 sentences explaining what the problem is asking]

# Analogy
[Real-world physical analogy]

# Solution Steps
### Step 1
[Explanation of step 1]
$$ [Math for step 1] $$
> 💡 Teaching Tip: [Tip for parent]

### Step 2
[Explanation of step 2]
$$ [Math for step 2] $$
> 💡 Teaching Tip: [Tip for parent]

(Continue for all steps)

6. If visualizing a function or equation would be helpful, you MUST include an interactive graph here by outputting a JSON block with the language \`math-graph\`. For example:
\`\`\`math-graph
{
  "expression": "x^2 - 4",
  "domain": [-10, 10],
  "points": 100,
  "annotations": [{"x": 2, "y": 0, "label": "Root"}, {"x": 0, "y": -4, "label": "Y-Intercept"}]
}
\`\`\`
7. If presenting data, comparisons, or statistics, you MUST include an interactive chart here by outputting a JSON block with the language \`data-chart\`. Supported types: bar, line, pie. For example:
\`\`\`data-chart
{
  "type": "bar",
  "title": "Plant Growth",
  "data": [{"name": "Snake Plant", "growth": 2}, {"name": "Ficus", "growth": 5}],
  "xKey": "name",
  "yKeys": ["growth"]
}
\`\`\`

Do not include any other text outside this structure for math problems.`;

    const lastUserMessage = [...messages].reverse().find((msg: any) => msg.role === "user");
    const lastUserText = typeof lastUserMessage?.text === "string" ? lastUserMessage.text.trim() : "";
    const canRunSymbolic = Boolean(lastUserText) && !lastUserMessage?.image && isLikelyMathQuestion(lastUserText);

    if (canRunSymbolic) {
      const cacheKey = buildProblemHash(`v8::${mode}::${lastUserText}`);
      const cached = getCachedSolution(cacheKey) as { text?: string } | undefined;
      if (cached?.text) {
        return new Response(cached.text, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      }

      const plan = await mathSymbolicSolverTool({ problem: lastUserText });

      if (!plan.canExecuteDeterministic) {
        const blockedText = `# Question
${lastUserText}

# Answer
I could not solve this question automatically yet.

# Solution
### Step 1
Identify the question as ${plan.problemType}.
$$
\\text{${(plan.blockingReason || "Deterministic execution blocked due to missing values.").replace(/"/g, '\\"')}}
$$

### Step 2
Try a cleaner math statement.
$$
\\text{${(plan.blockingRetryHint || "Rewrite the problem with direct expressions and explicit values.").replace(/"/g, '\\"')}}
$$

# Explanation
- The current parser failed on this wording.
- A cleaner statement usually solves the problem on the next pass.`;
        cacheSolution(cacheKey, { text: blockedText });
        return new Response(blockedText, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      }

      const execution = await mathInterpreterTool({
        title: "chat_symbolic_solve",
        problemType: plan.problemType,
        code: plan.generatedCode,
        expectedOutput: "exact symbolic output",
      });

      if (execution.error) {
        const retryHint = execution.retryHint || "Rewrite the problem with direct expressions and explicit values.";
        const missingValuesText = plan.missingValues.length > 0 ? `Please include: ${plan.missingValues.join(", ")}.` : "Rewrite the question in a shorter, cleaner math form.";
        const deterministicErrorText = `# Question
${lastUserText}

# Answer
I could not solve this question automatically yet.

# Solution
### Step 1
Identify the question as ${plan.problemType}.
$$
\\text{${missingValuesText.replace(/"/g, '\\"')}}
$$

### Step 2
\\text{${retryHint.replace(/"/g, '\\"')}}
$$

# Explanation
- The current parser failed on this wording.
- A cleaner statement usually solves the problem on the next pass.`;
        cacheSolution(cacheKey, { text: deterministicErrorText });
        return new Response(deterministicErrorText, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      }

      const symbolicPrompt = `Use this exact symbolic computation result.
Problem: ${lastUserText}
Problem type: ${plan.problemType}
SymPy code:
\`\`\`python
${plan.generatedCode}
\`\`\`
SymPy output:
\`\`\`
${execution.output || "(empty)"}
\`\`\`
Never contradict the symbolic output.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: [{ role: "user", parts: [{ text: symbolicPrompt }] }],
        config: {
          systemInstruction: mode === "solver" ? solverInstruction : tutorInstruction,
        },
      });

      const finalText = response.text || execution.output || "I could not compute a symbolic result for this problem.";
      cacheSolution(cacheKey, { text: finalText });
      return new Response(finalText, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.1-flash-lite-preview",
      contents: apiHistory,
      config: {
        systemInstruction: mode === "solver" ? solverInstruction : tutorInstruction,
      }
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
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
