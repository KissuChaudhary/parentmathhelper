import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { buildProblemHash, cacheSolution, getCachedSolution } from "@/lib/cache/math-cache";
import { mathInterpreterTool, mathSymbolicSolverTool } from "@/lib/tools/index";

const getExecutionStatus = (success: boolean, error?: string) => {
  if (error) return "error" as const;
  return success ? "completed" as const : "error" as const;
};

function formatReadableMathResponse(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const withHeaders = normalized
    .replace(/\n?#\s*Question\s*\n?/gi, "\n# Question\n")
    .replace(/\n?#\s*Answer\s*\n?/gi, "\n# Answer\n")
    .replace(/\n?#\s*Solution\s*\n?/gi, "\n# Solution\n")
    .replace(/\n?#\s*Explanation\s*\n?/gi, "\n# Explanation\n");
  const formattedBlocks = withHeaders.replace(/\$\$([\s\S]*?)\$\$/g, (_, eq) => `\n$$\n${String(eq).trim()}\n$$\n`);
  const splitSection = formattedBlocks.match(/([\s\S]*?# Solution\n)([\s\S]*?)(\n# Explanation[\s\S]*|$)/i);
  if (!splitSection) return formattedBlocks.replace(/\n{3,}/g, "\n\n").trim();
  const [, before, solutionBody, after] = splitSection;
  const compactedSolution = solutionBody
    .replace(/([^\n])\s+(?=###\s*Step\s*\d+)/g, "$1\n\n")
    .replace(/(\b[A-Za-z]\s*=\s*[^=\n]+?)\s+(?=\b[A-Za-z]\s*=)/g, "$1\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return `${before}${compactedSolution}${after}`.replace(/\n{3,}/g, "\n\n").trim();
}

function buildDeterministicFailureMessage(
  problem: string,
  problemType: string,
  retryHint?: string,
  missingValues: string[] = [],
  blockingReason?: string
) {
  const guidance =
    missingValues.length > 0
      ? `Please include these values explicitly: ${missingValues.join(", ")}.`
      : blockingReason || "The solver could not turn this prompt into a reliable math expression.";
  return `# Question
${problem}

# Answer
I could not solve this question automatically yet.

# Solution
### Step 1
Identify the question as ${problemType}.
$$
\\text{${guidance.replace(/"/g, '\\"')}}
$$

### Step 2
Try a cleaner math statement.
$$
\\text{${(retryHint || "Rewrite the problem as a direct math expression or a short word problem with explicit values.").replace(/"/g, '\\"')}}
$$

# Explanation
- The current parser failed on this wording.
- The next pass should succeed with a cleaner statement or explicit values.`;
}

export async function POST(req: Request) {
  try {
    const { problem, userQuery } = await req.json();
    const normalizedContext = typeof userQuery === "string" ? userQuery.trim() : "";

    if (!problem || typeof problem !== "string") {
      return NextResponse.json({ error: "Problem is required" }, { status: 400 });
    }

    const cacheKey = buildProblemHash(`v8::${problem}::${normalizedContext}`);
    const cached = getCachedSolution(cacheKey);
    if (cached) {
      const cachedRecord = cached as Record<string, any>;
      const normalizedSymbolic = cachedRecord.symbolic
        ? {
            ...cachedRecord.symbolic,
            status:
              cachedRecord.symbolic.status ??
              getExecutionStatus(Boolean(cachedRecord.success), cachedRecord.symbolic.error),
          }
        : undefined;
      return NextResponse.json({
        success: true,
        cached: true,
        ...cachedRecord,
        ...(normalizedSymbolic ? { symbolic: normalizedSymbolic } : {}),
      });
    }

    const plan = await mathSymbolicSolverTool({
      problem,
      context: normalizedContext || undefined,
    });

    if (!plan.canExecuteDeterministic) {
      const payload = {
        success: false,
        problem,
        symbolic: {
          problemType: plan.problemType,
          deterministicPath: plan.deterministicPath,
          classifierConfidence: plan.classifierConfidence,
          requiredValues: plan.requiredValues,
          missingValues: plan.missingValues,
          extractedParameters: plan.extractedParameters,
          parameterConfidence: plan.parameterConfidence,
          ambiguitySignals: plan.ambiguitySignals,
          qualityScore: plan.qualityScore,
          qualityBreakdown: plan.qualityBreakdown,
          canExecuteDeterministic: plan.canExecuteDeterministic,
          blockingReason: plan.blockingReason,
          blockingRetryHint: plan.blockingRetryHint,
          code: plan.generatedCode,
          output: "",
          error: plan.blockingReason || "Deterministic execution blocked due to missing required values.",
          errorCode: "DETERMINISTIC_INPUT_MISSING",
          retryHint: plan.blockingRetryHint,
          runtime: "none" as const,
          status: "error" as const,
        },
        solution: buildDeterministicFailureMessage(
          problem,
          plan.problemType,
          plan.blockingRetryHint,
          plan.missingValues,
          plan.blockingReason
        ),
      };
      cacheSolution(cacheKey, payload);
      return NextResponse.json(payload);
    }

    const execution = await mathInterpreterTool({
      title: "sympy_solve",
      problemType: plan.problemType,
      expectedOutput: "exact symbolic output",
      code: plan.generatedCode,
    });

    if (execution.error) {
      const payload = {
        success: false,
        problem,
        symbolic: {
          problemType: plan.problemType,
          deterministicPath: plan.deterministicPath,
          classifierConfidence: plan.classifierConfidence,
          requiredValues: plan.requiredValues,
          missingValues: plan.missingValues,
          extractedParameters: plan.extractedParameters,
          parameterConfidence: plan.parameterConfidence,
          ambiguitySignals: plan.ambiguitySignals,
          qualityScore: plan.qualityScore,
          qualityBreakdown: plan.qualityBreakdown,
          canExecuteDeterministic: plan.canExecuteDeterministic,
          blockingReason: plan.blockingReason,
          blockingRetryHint: plan.blockingRetryHint,
          code: plan.generatedCode,
          output: execution.output,
          error: execution.error,
          errorCode: execution.errorCode,
          retryHint: execution.retryHint,
          runtime: execution.runtime,
          status: "error" as const,
        },
        solution: buildDeterministicFailureMessage(
          problem,
          plan.problemType,
          execution.retryHint,
          plan.missingValues,
          execution.error
        ),
      };
      cacheSolution(cacheKey, payload);
      return NextResponse.json(payload);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const payload = {
        success: execution.success,
        problem,
        symbolic: {
          problemType: plan.problemType,
          deterministicPath: plan.deterministicPath,
          classifierConfidence: plan.classifierConfidence,
          requiredValues: plan.requiredValues,
          missingValues: plan.missingValues,
          extractedParameters: plan.extractedParameters,
          parameterConfidence: plan.parameterConfidence,
          ambiguitySignals: plan.ambiguitySignals,
          qualityScore: plan.qualityScore,
          qualityBreakdown: plan.qualityBreakdown,
          code: plan.generatedCode,
          output: execution.output,
          error: execution.error,
          errorCode: execution.errorCode,
          retryHint: execution.retryHint,
          runtime: execution.runtime,
          status: getExecutionStatus(execution.success, execution.error),
        },
        solution: execution.output,
      };
      cacheSolution(cacheKey, payload);
      return NextResponse.json(payload);
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a math explainer for parents and students.
Use the exact symbolic execution results below.
Never invent a different numeric or symbolic answer.
Write cleanly for non-technical readers.

Problem:
${problem}

Context:
${normalizedContext || "None"}

Problem type:
${plan.problemType}

SymPy code:
\`\`\`python
${plan.generatedCode}
\`\`\`

SymPy output:
\`\`\`
${execution.output || "(empty)"}
\`\`\`

Respond in this structure:
# Question
[Restate]

# Answer
[Exact symbolic answer]

# Solution
[Each step on its own lines using this exact pattern]
### Step 1
[One short sentence]
$$
[Exactly one equation or transformation]
$$
### Step 2
[One short sentence]
$$
[Exactly one equation or transformation]
$$
(Continue as needed. Never put multiple equations on one line. Never chain many equalities in one line.)

# Explanation
[Clear teaching explanation and any caveats in short bullet points]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const payload = {
      success: execution.success,
      problem,
      symbolic: {
        problemType: plan.problemType,
        deterministicPath: plan.deterministicPath,
        classifierConfidence: plan.classifierConfidence,
        requiredValues: plan.requiredValues,
        missingValues: plan.missingValues,
        extractedParameters: plan.extractedParameters,
        parameterConfidence: plan.parameterConfidence,
        ambiguitySignals: plan.ambiguitySignals,
        qualityScore: plan.qualityScore,
        qualityBreakdown: plan.qualityBreakdown,
        canExecuteDeterministic: plan.canExecuteDeterministic,
        blockingReason: plan.blockingReason,
        blockingRetryHint: plan.blockingRetryHint,
        code: plan.generatedCode,
        output: execution.output,
        error: execution.error,
        errorCode: execution.errorCode,
        retryHint: execution.retryHint,
        runtime: execution.runtime,
        status: getExecutionStatus(execution.success, execution.error),
      },
      solution: response.text ? formatReadableMathResponse(response.text) : execution.output,
    };
    cacheSolution(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("Math solve route error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to solve math problem" },
      { status: 500 }
    );
  }
}
