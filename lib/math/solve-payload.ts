import { GoogleGenAI } from "@google/genai";
import { evaluate } from "mathjs";
import { buildProblemHash, cacheSolution, getCachedSolution } from "@/lib/cache/math-cache";
import { extractCleanMath } from "@/lib/math/llm-extractor";
import { mathSolverSystemPrompt } from "@/lib/prompts/math-solver-system";
import { mathTutorSystemPrompt } from "@/lib/prompts/math-user-guide";

export type SolveMode = "solver" | "tutor";

export type TeachingMeta = {
  mode: SolveMode;
  gradeBand: string;
  confidence: "high" | "medium" | "low";
  validationPassed: boolean;
  commonSkill: string;
  hasPractice: boolean;
  status: "completed" | "error";
  source: "llm" | "offline";
  contentVersion: string;
};

type SolveRouteDependencies = {
  extractProblem?: typeof extractCleanMath;
  complete?: (args: { systemInstruction: string; prompt: string }) => Promise<string>;
};

type SolveMathPayload =
  | {
      success: true;
      cached?: boolean;
      problem: string;
      normalizedProblem: string;
      mode: SolveMode;
      gradeBand: string;
      solution: string;
      metadata: TeachingMeta;
    }
  | {
      error: string;
    };

type LocalArithmeticSolution = {
  expression: string;
  answerValue: number;
  answerText: string;
};

const CONTENT_VERSION = "grades-3-6-v1";

function normalizeMultilineText(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function toTitleCaseWord(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function buildHeadingPattern(heading: string) {
  return new RegExp(`(^|\\n)#\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n`, "i");
}

function extractSection(text: string, heading: string) {
  const normalized = normalizeMultilineText(text);
  const headingPattern = buildHeadingPattern(heading);
  const match = headingPattern.exec(normalized);
  if (!match) return "";
  const startIndex = match.index + match[0].length;
  const remainder = normalized.slice(startIndex);
  const nextHeading = remainder.search(/\n#\s+/);
  return (nextHeading >= 0 ? remainder.slice(0, nextHeading) : remainder).trim();
}

function normalizeHeading(text: string, from: string, to: string) {
  return text.replace(new RegExp(`(^|\\n)#\\s*${from}\\s*\\n`, "gi"), `$1# ${to}\n`);
}

function formatStructuredMathResponse(text: string, mode: SolveMode) {
  let normalized = normalizeMultilineText(text)
    .replace(/\n?#\s*Answer\s*\n/gi, "\n# Final Answer\n")
    .replace(/\n?#\s*Solution\s*\n/gi, "\n# Solution Steps\n")
    .replace(/\n?#\s*Explanation\s*\n/gi, "\n# Why This Works\n");

  if (mode === "solver") {
    normalized = normalizeHeading(normalized, "Why This Works", "Why This Works");
    if (!buildHeadingPattern("Common Mistake").test(normalized)) {
      normalized = `${normalized}\n\n# Common Mistake\n- Watch for regrouping, operation choice, or skipped units.`;
    }
  } else {
    normalized = normalizeHeading(normalized, "Plain English Translation", "What The Child Needs To Understand");
    normalized = normalizeHeading(normalized, "Analogy", "How To Explain It");
    normalized = normalizeHeading(normalized, "Teaching Tips?", "How To Explain It");
    normalized = normalizeHeading(normalized, "Solution", "Solution Steps");
    normalized = normalizeHeading(normalized, "Explanation", "How To Explain It");
    if (!buildHeadingPattern("Practice Together").test(normalized)) {
      normalized = `${normalized}\n\n# Practice Together\n- Try one more problem with the same skill using smaller numbers first.\n- Praise the strategy, not just the answer.`;
    }
    if (!buildHeadingPattern("Common Mistake").test(normalized)) {
      normalized = `${normalized}\n\n# Common Mistake\n- Children often rush and choose the wrong operation before reading the whole question.`;
    }
  }

  return normalized.replace(/\$\$([\s\S]*?)\$\$/g, (_, block) => `\n$$\n${String(block).trim()}\n$$\n`).replace(/\n{3,}/g, "\n\n").trim();
}

export function inferElementarySkill(problem: string) {
  const text = problem.toLowerCase();
  if (/\b(fraction|fractions|numerator|denominator|equivalent|common denominator|mixed number|improper)\b|\/\d/.test(text)) return "fractions";
  if (/\b(decimal|tenths|hundredths|place value)\b|\d+\.\d+/.test(text)) return "decimals";
  if (/\b(long division|divide|division|quotient|remainder)\b|÷/.test(text)) return "long division";
  if (/\b(word problem|altogether|left|remain|shared|each|total|more|less|how many|how much|in all|altogether)\b/.test(text)) return "word problems";
  if (/\b(perimeter|area)\b/.test(text)) return "area and perimeter";
  if (/\b(measure|measurement|convert|conversion|length|weight|mass|liter|ml|cm|meter|inch|foot|yard|mile|kilometer)\b/.test(text)) return "measurement conversions";
  if (/\b(pattern|input|output|rule|variable|unknown|equation)\b/.test(text)) return "beginning algebra";
  if (/\b(time|clock|minute|hour)\b/.test(text)) return "time";
  if (/\b(money|coin|dollar|cent)\b/.test(text)) return "money";
  if (/\b(multiply|multiplication|product|times|groups of|array)\b|×|\*/.test(text)) return "multiplication";
  if (/\b(subtract|difference|minus|left over)\b|(?<!\d)-\d|\d\s*-\s*\d/.test(text)) return "subtraction";
  if (/\b(add|sum|plus)\b|\d\s*\+\s*\d/.test(text)) return "addition";
  return "elementary homework";
}

export function inferElementaryGradeBand(problem: string) {
  const text = problem.toLowerCase();
  if (/\b(long division|equivalent fraction|common denominator|decimal|perimeter|area|measurement conversion|conversion|pattern|equation|multi-step)\b|\d\/\d/.test(text)) {
    return "Grades 4-6";
  }
  if (/\b(fraction|multiply|division|remainder|array|equal groups|word problem)\b/.test(text)) {
    return "Grades 3-5";
  }
  return "Grades 3-6";
}

function normalizeArithmeticProblem(problem: string) {
  const cleaned = problem
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/[?]/g, " ")
    .replace(/÷/g, "/")
    .replace(/×/g, "*")
    .replace(/(\d)\s*x\s*(\d)/g, "$1 * $2")
    .replace(/what is|calculate|solve|find|evaluate|please|can you|help me|show me/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!/[+\-*/]/.test(cleaned) || /[a-z]/.test(cleaned.replace(/\bby\b/g, ""))) {
    return null;
  }

  const expression = cleaned.replace(/\bby\b/g, " ").replace(/\s+/g, " ").trim();
  return /^[\d\s()+\-*/.]+$/.test(expression) ? expression : null;
}

function formatNumberAnswer(value: number) {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(4)));
}

function solveArithmeticLocally(problem: string): LocalArithmeticSolution | null {
  const expression = normalizeArithmeticProblem(problem);
  if (!expression) return null;

  try {
    const raw = evaluate(expression);
    if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
    return {
      expression,
      answerValue: raw,
      answerText: formatNumberAnswer(raw),
    };
  } catch {
    return null;
  }
}

function parseComparableAnswer(value: string) {
  const cleaned = value
    .replace(/[#*$`]/g, " ")
    .replace(/\b(final answer|answer)\b/gi, " ")
    .replace(/,/g, "")
    .replace(/=/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;
  if (/^[\d\s()+\-*/.]+$/.test(cleaned)) {
    try {
      const parsed = evaluate(cleaned);
      return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
}

export function verifyElementaryAnswer(problem: string, claimedAnswer: string, expectedAnswer?: string) {
  const localSolution = solveArithmeticLocally(problem);
  const expectedValue = parseComparableAnswer(expectedAnswer || localSolution?.answerText || "");
  const claimedValue = parseComparableAnswer(claimedAnswer);

  if (expectedValue === null || claimedValue === null) {
    return {
      verified: false,
      expected: expectedAnswer || localSolution?.answerText || "",
      candidate: claimedAnswer,
      verificationMethod: "unavailable" as const,
    };
  }

  const verified = Math.abs(expectedValue - claimedValue) < 0.0001;
  return {
    verified,
    expected: expectedAnswer || localSolution?.answerText || "",
    candidate: claimedAnswer,
    verificationMethod: "arithmetic" as const,
  };
}

function buildOfflineSolution(problem: string, mode: SolveMode, localSolution: LocalArithmeticSolution | null) {
  if (localSolution) {
    if (mode === "solver") {
      return `# Question
${problem}

# Final Answer
${localSolution.answerText}

# Solution Steps
### Step 1
Read the problem as one arithmetic sentence.
$$
${localSolution.expression}
$$

### Step 2
Compute the value carefully.
$$
${localSolution.expression} = ${localSolution.answerText}
$$

# Why This Works
- The problem can be solved with direct arithmetic.
- Keeping the whole number sentence together helps avoid sign mistakes.

# Common Mistake
- Children may rush and switch the operation sign.
- Children may compute part of the sentence and forget the rest.`;
    }

    return `# What The Child Needs To Understand
This problem is asking the child to follow one clear number sentence and keep track of the operation signs.

# How To Explain It
Tell your child to read the whole problem once, then point to each symbol and say what it means before calculating.

# Solution Steps
### Step 1
Read the arithmetic sentence out loud together.
$$
${localSolution.expression}
$$
> Teaching Tip: Ask, "What should we do first?"

### Step 2
Work through the number sentence carefully.
$$
${localSolution.expression} = ${localSolution.answerText}
$$
> Teaching Tip: Have your child say each operation name as they solve.

# Common Mistake
- Children often move too quickly and miss a sign or operation.

# Practice Together
- Try the same type of problem with different numbers.
- Praise the child for showing each step clearly.`;
  }

  if (mode === "solver") {
    return `# Question
${problem}

# Final Answer
I need the AI model to fully solve this elementary problem.

# Solution Steps
### Step 1
This looks like an elementary homework question that needs a teaching-style explanation.
$$
\\text{Please try again when the AI model is available.}
$$

# Why This Works
- The product is focused on parent-friendly Grades 3-6 explanations.
- Higher-friction topics like fractions and word problems still need the model to build the best step order.

# Common Mistake
- Avoid guessing when the worksheet leaves out key details.`;
  }

  return `# What The Child Needs To Understand
This looks like a Grades 3-6 homework question, but I need the AI model to give the best parent-friendly explanation.

# How To Explain It
Read the worksheet slowly, underline the important numbers, and ask what the question wants first.

# Solution Steps
### Step 1
Find the important numbers and what needs to be solved.
$$
\\text{Look for the clue words and the question being asked.}
$$
> Teaching Tip: Ask, "What is the problem asking us to find?"

# Common Mistake
- Children may grab the first numbers they see without understanding the question.

# Practice Together
- Try retelling the problem in your own words before solving.
- Calm, simple language helps more than rushing.`;
}

function buildCompletionPrompt({
  mode,
  problem,
  normalizedProblem,
  context,
  gradeBand,
  commonSkill,
  localSolution,
}: {
  mode: SolveMode;
  problem: string;
  normalizedProblem: string;
  context: string;
  gradeBand: string;
  commonSkill: string;
  localSolution: LocalArithmeticSolution | null;
}) {
  return `Original problem:
${problem}

Cleaned problem:
${normalizedProblem}

Likely grade band:
${gradeBand}

Likely skill:
${commonSkill}

Extra context:
${context || "None"}

Local validation check:
${localSolution ? `Direct arithmetic result: ${localSolution.answerText}` : "No direct arithmetic check available"}

Stay within Grades 3-6 classroom expectations and keep the answer practical for a parent helping at home.
Prioritize clarity on fractions, long division, decimals, multi-step word problems, area vs perimeter, measurement conversions, and beginning algebra patterns when relevant.`;
}

async function runModelCompletion({ systemInstruction, prompt }: { systemInstruction: string; prompt: string }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
    config: {
      systemInstruction,
    },
  });

  return response.text?.trim() || "";
}

export async function solveMathProblemPayload(
  {
    problem,
    userQuery,
    mode = "solver",
  }: {
    problem: string;
    userQuery?: string;
    mode?: SolveMode;
  },
  deps: SolveRouteDependencies = {}
): Promise<SolveMathPayload> {
  const normalizedContext = typeof userQuery === "string" ? userQuery.trim() : "";

  if (!problem || typeof problem !== "string") {
    return { error: "Problem is required" };
  }

  const extractProblem = deps.extractProblem ?? extractCleanMath;
  const normalizedProblem = await extractProblem(problem, normalizedContext);
  const gradeBand = inferElementaryGradeBand(`${normalizedProblem} ${normalizedContext}`.trim());
  const commonSkill = inferElementarySkill(normalizedProblem);
  const cacheKey = buildProblemHash(
    `${CONTENT_VERSION}::${mode}::${gradeBand}::${normalizedProblem}::${normalizedContext}`
  );
  const cached = getCachedSolution(cacheKey);

  if (cached) {
    return {
      ...(cached as Omit<Extract<SolveMathPayload, { success: true }>, "cached">),
      cached: true,
    };
  }

  const localSolution = solveArithmeticLocally(normalizedProblem);
  const complete = deps.complete ?? runModelCompletion;
  let generatedText = "";

  try {
    generatedText = await complete({
      systemInstruction: mode === "solver" ? mathSolverSystemPrompt : mathTutorSystemPrompt,
      prompt: buildCompletionPrompt({
        mode,
        problem,
        normalizedProblem,
        context: normalizedContext,
        gradeBand,
        commonSkill,
        localSolution,
      }),
    });
  } catch (error) {
    console.error("Elementary solve completion failed:", error);
  }

  const solution = generatedText
    ? formatStructuredMathResponse(generatedText, mode)
    : buildOfflineSolution(problem, mode, localSolution);
  const finalAnswer =
    extractSection(solution, "Final Answer") ||
    extractSection(solution, "Answer") ||
    localSolution?.answerText ||
    "";
  const verification = verifyElementaryAnswer(normalizedProblem, finalAnswer, localSolution?.answerText);
  const payload: Extract<SolveMathPayload, { success: true }> = {
    success: true,
    problem,
    normalizedProblem,
    mode,
    gradeBand,
    solution,
    metadata: {
      mode,
      gradeBand,
      confidence: verification.verified ? "high" : generatedText ? "medium" : "low",
      validationPassed: verification.verified,
      commonSkill,
      hasPractice: /#\s*Practice Together/i.test(solution),
      status: "completed",
      source: generatedText ? "llm" : "offline",
      contentVersion: CONTENT_VERSION,
    },
  };

  cacheSolution(cacheKey, payload);
  return payload;
}
