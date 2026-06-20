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
  complete?: (args: { systemInstruction: string; prompt: string; image?: string; contents?: any }) => Promise<string>;
  analyzeTurn?: typeof analyzeChatTurn;
};

export type SolveHistoryItem = {
  role: "user" | "model";
  text: string;
  responseType?: string;
  image?: boolean;
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

const CONTENT_VERSION = "k5-v1";

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

function ensureSection(text: string, heading: string, content: string) {
  if (buildHeadingPattern(heading).test(text)) return text;
  return `${text}\n\n# ${heading}\n${content}`.trim();
}

function formatStructuredMathResponse(text: string, mode: SolveMode, problem: string) {
  let normalized = normalizeMultilineText(text)
    .replace(/\n?#\s*Answer\s*\n/gi, "\n# Final Answer\n")
    .replace(/\n?#\s*Solution\s*\n/gi, "\n# Solution Steps\n")
    .replace(/\n?#\s*Explanation\s*\n/gi, "\n# Why This Works\n")
    .replace(/\n?#\s*(?:(?:Hands[- ]?On\s*)?Activity|(?:🎲\s*)?Try\s*together)\s*\n/gi, "\n# 🎲 Try together\n")
    .replace(/\n?#\s*(?:(?:🐼\s*)?Pando\s*says|What\s*The\s*Child\s*Needs\s*To\s*Understand)\s*\n/gi, "\n# 🐼 Pando says\n")
    .replace(/\n?#\s*(?:(?:🗣\s*)?Say\s*this\s*to\s*your\s*child|How\s*To\s*Explain\s*It)\s*\n/gi, "\n# 🗣 Say this to your child\n")
    .replace(/\n?#\s*(?:(?:⭐\s*)?Celebrate|Practice\s*Together)\s*\n/gi, "\n# ⭐ Celebrate\n");

  if (mode === "solver") {
    normalized = ensureSection(normalized, "Question", problem);
    normalized = ensureSection(normalized, "Final Answer", "I need to double-check the final answer.");
    normalized = ensureSection(
      normalized,
      "Solution Steps",
      "### Step 1\nUse the most reliable method from the problem and check each operation carefully."
    );
    normalized = normalizeHeading(normalized, "Why This Works", "Why This Works");
    normalized = ensureSection(
      normalized,
      "Why This Works",
      "- The method matches the problem type.\n- Checking each step helps avoid classroom-style mistakes."
    );
    if (!buildHeadingPattern("Common Mistake").test(normalized)) {
      normalized = `${normalized}\n\n# Common Mistake\n- Watch for regrouping, operation choice, or skipped units.`;
    }
    if (!buildHeadingPattern("🎲 Try together").test(normalized) && !buildHeadingPattern("Try together").test(normalized)) {
      normalized = `${normalized}\n\n# 🎲 Try together\n- Try modeling this problem with coins, blocks, or small objects at the kitchen table.`;
    }
  } else {
    normalized = normalizeHeading(normalized, "Plain English Translation", "🐼 Pando says");
    normalized = normalizeHeading(normalized, "Analogy", "🗣 Say this to your child");
    normalized = normalizeHeading(normalized, "Teaching Tips?", "🗣 Say this to your child");
    normalized = normalizeHeading(normalized, "Solution", "Solution Steps");
    normalized = normalizeHeading(normalized, "Explanation", "🗣 Say this to your child");
    
    normalized = ensureSection(
      normalized,
      "🐼 Pando says",
      "This problem works best when the child slows down and focuses on the skill the worksheet is practicing."
    );
    normalized = ensureSection(
      normalized,
      "🗣 Say this to your child",
      "Use one short explanation at a time, then ask your child to say the idea back in their own words."
    );
    normalized = ensureSection(
      normalized,
      "Solution Steps",
      "### Step 1\nName the skill first and work through one step at a time.\n$$\n\\text{Start with the first useful move in the problem.}\n$$\n> 🐼 Tip: Ask, \"What is this step trying to do?\""
    );
    if (!buildHeadingPattern("⭐ Celebrate").test(normalized) && !buildHeadingPattern("Celebrate").test(normalized)) {
      normalized = `${normalized}\n\n# ⭐ Celebrate\n- Try one more problem with the same skill using smaller numbers first.\n- Praise the strategy, not just the answer.`;
    }
    if (!buildHeadingPattern("Common Mistake").test(normalized)) {
      normalized = `${normalized}\n\n# Common Mistake\n- Children often rush and choose the wrong operation before reading the whole question.`;
    }
    if (!buildHeadingPattern("🎲 Try together").test(normalized) && !buildHeadingPattern("Try together").test(normalized)) {
      normalized = `${normalized}\n\n# 🎲 Try together\n- Try modeling this concept with coins, blocks, or drawings so the child can see and touch the math.`;
    }
  }

  return normalized.replace(/\$\$([\s\S]*?)\$\$/g, (_, block) => `\n$$\n${String(block).trim()}\n$$\n`).replace(/\n{3,}/g, "\n\n").trim();
}

function summarizeHistory(history: SolveHistoryItem[]) {
  const recentHistory = history
    .map((item) => ({
      role: item.role,
      responseType: item.responseType,
      text: normalizeMultilineText(item.text || ""),
      image: item.image,
    }))
    .filter((item) => item.text || item.image)
    .slice(-6);

  if (recentHistory.length === 0) {
    return "None";
  }

  return recentHistory
    .map((item, index) => {
      const speaker = item.role === "user" ? "Parent" : "Assistant";
      const label = item.responseType ? ` (${item.responseType})` : "";
      const imageNote = item.image ? "\n[Image was attached in this turn.]" : "";
      return `${index + 1}. ${speaker}${label}\n${item.text || "[No text]"}${imageNote}`;
    })
    .join("\n\n");
}

function buildModeOutputReminder(mode: SolveMode) {
  if (mode === "solver") {
    return `Return this exact structure:

# Question
[Restate the problem clearly]

# Final Answer
[Short final answer]

# Solution Steps
### Step 1
[Short explanation]
$$
[Equation or number sentence]
$$

[Continue as needed]

# Why This Works
- [2-4 short bullets]

# Common Mistake
- [1-2 short bullets]

# 🎲 Try together
- [1-2 short bullets describing a physical way to model this problem using coins, blocks, food, drawings, or household objects]`;
  }

  return `Return this exact structure:

# 🐼 Pando says
[1-2 short paragraphs]

# 🗣 Say this to your child
[A short parent-facing script]

# Solution Steps
### Step 1
[Short explanation]
$$
[Equation or transformation]
$$
> 🐼 Tip: [One short sentence]

[Continue as needed]

# Common Mistake
- [1-2 short bullets]

# 🎲 Try together
- [1-2 short bullets describing a physical way to practice this concept using coins, blocks, food, drawings, or household objects]

# ⭐ Celebrate
- [1-2 short bullets]`;
}

export function inferElementarySkill(problem: string) {
  const text = problem.toLowerCase();
  if (/\b(fraction|fractions|numerator|denominator|equivalent|common denominator|mixed number|improper)\b|\/\d/.test(text)) return "fractions";
  if (/\b(decimal|tenths|hundredths)\b|\d+\.\d+/.test(text)) return "decimals";
  if (/\b(long division|divide|division|quotient|remainder)\b|÷/.test(text)) return "long division";
  if (/\b(perimeter|area)\b/.test(text)) return "area and perimeter";
  if (/\b(measure|measurement|convert|conversion|length|weight|mass|liter|ml|cm|meter|inch|foot|yard|mile|kilometer)\b/.test(text)) return "measurement conversions";
  if (/\b(place value|ones|tens|hundreds|thousands|digit)\b/.test(text)) return "place value";
  if (/\b(number bond|number bonds|part.part.whole|make\s*10|making\s*10|friends of 10)\b/.test(text)) return "number bonds";
  if (/\b(skip count|skip counting|count by|counting by)\b/.test(text)) return "skip counting";
  if (/\b(shape|shapes|triangle|rectangle|square|circle|hexagon|sides|corners|vertices|edges)\b/.test(text)) return "shapes and geometry";
  if (/\b(time|clock|minute|hour|half past|quarter past|o'clock)\b/.test(text)) return "time";
  if (/\b(money|coins?|dollars?|cents?|pennies|penny|nickels?|dimes?|quarters?)\b/.test(text)) return "money";
  if (/\b(greater|less than|compare|comparing|bigger|smaller|equal to|more than|fewer)\b/.test(text)) return "comparing numbers";
  if (/\b(regroup|regrouping|borrow|borrowing|carry|carrying)\b/.test(text)) return "regrouping";
  if (/\b(word problem|altogether|left|remain|shared|each|total|how many|how much|in all)\b/.test(text)) return "word problems";
  if (/\b(count|counting|tally)\b/.test(text)) return "counting";
  if (/\b(pattern|input|output|rule|variable|unknown|equation)\b/.test(text)) return "beginning algebra";
  if (/\b(multiply|multiplication|product|times|groups of|array)\b|×|\*/.test(text)) return "multiplication";
  if (/\b(subtract|difference|minus|left over)\b|(?<!\d)-\d|\d\s*-\s*\d/.test(text)) return "subtraction";
  if (/\b(add|sum|plus)\b|\d\s*\+\s*\d/.test(text)) return "addition";
  return "K-5 homework";
}

export function inferElementaryGradeBand(problem: string) {
  const text = problem.toLowerCase();
  if (/\b(long division|equivalent fractions?|common denominator|decimal|perimeter|area|measurement conversion|conversion|pattern|equation|multi-step)\b|\d\/\d/.test(text)) {
    return "Grades 3-5";
  }
  if (/\b(fraction|multiply|multiplication|division|remainder|arrays?|equal groups|word problem)\b/.test(text)) {
    return "Grades 2-4";
  }
  if (/\b(number bonds?|skip count|counting|tally|shapes?|compare|comparing|greater|less than|place value|regroup|regrouping|borrow|carry)\b/.test(text)) {
    return "Grades K-2";
  }
  return "Grades K-5";
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
- Children may compute part of the sentence and forget the rest.

# 🎲 Try together
- Use coins or small objects to represent the numbers, then physically move them to match each operation.`;
    }

    return `# 🐼 Pando says
This problem is asking the child to follow one clear number sentence and keep track of the operation signs.

# 🗣 Say this to your child
Tell your child to read the whole problem once, then point to each symbol and say what it means before calculating.

# Solution Steps
### Step 1
Read the arithmetic sentence out loud together.
$$
${localSolution.expression}
$$
> 🐼 Tip: Ask, "What should we do first?"

### Step 2
Work through the number sentence carefully.
$$
${localSolution.expression} = ${localSolution.answerText}
$$
> 🐼 Tip: Have your child say each operation name as they solve.

# Common Mistake
- Children often move too quickly and miss a sign or operation.

# 🎲 Try together
- Line up small objects (cereal, buttons, coins) to represent each number, then act out the operation together.

# ⭐ Celebrate
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
- The product is focused on parent-friendly K-5 explanations.
- Higher-friction topics like fractions and word problems still need the model to build the best step order.

# Common Mistake
- Avoid guessing when the worksheet leaves out key details.

# 🎲 Try together
- While waiting, try acting out the problem with small objects or drawings at home.`;
  }

  return `# 🐼 Pando says
This looks like a K-5 homework question, but I need the AI model to give the best parent-friendly explanation.

# 🗣 Say this to your child
Read the worksheet slowly, underline the important numbers, and ask what the question wants first.

# Solution Steps
### Step 1
Find the important numbers and what needs to be solved.
$$
\\text{Look for the clue words and the question being asked.}
$$
> 🐼 Tip: Ask, "What is the problem asking us to find?"

# Common Mistake
- Children may grab the first numbers they see without understanding the question.

# 🎲 Try together
- Try drawing a simple picture of the problem together, or act it out with objects from around the house.

# ⭐ Celebrate
- Try retelling the problem in your own words before solving.
- Calm, simple language helps more than rushing.`;
}

function buildCompletionPrompt({
  mode,
  problem,
  normalizedProblem,
  context,
  history,
  gradeBand,
  commonSkill,
  localSolution,
  hasImage,
  priorAnswer,
  followUpIntent,
}: {
  mode: SolveMode;
  problem: string;
  normalizedProblem: string;
  context: string;
  history: SolveHistoryItem[];
  gradeBand: string;
  commonSkill: string;
  localSolution: LocalArithmeticSolution | null;
  hasImage: boolean;
  priorAnswer: string;
  followUpIntent: string;
}) {
  const imageInstruction = hasImage
    ? "\nIf the worksheet problem or student work is mainly in the image, read from the image first and restate the clearest version you can."
    : "";
  const followUpInstruction = followUpIntent
    ? `\nThis is a follow-up request. Directly satisfy the request: ${followUpIntent}.`
    : "";
  const priorAnswerInstruction = priorAnswer
    ? "\nReuse the earlier answer where helpful, but correct it if needed."
    : "";

  return `Original problem:
${problem}

Cleaned problem:
${normalizedProblem}

Likely grade band:
${gradeBand}

Likely skill:
${commonSkill}

Current parent request:
${context || "Solve or explain the homework clearly."}

Follow-up intent:
${followUpIntent || "None"}

Prior answer to build on:
${priorAnswer || "None"}

Recent same-mode history:
${summarizeHistory(history)}

Image attached:
${hasImage ? "Yes. Use the image as a primary source for the homework and written work." : "No"}

Local validation check:
${localSolution ? `Direct arithmetic result: ${localSolution.answerText}` : "No direct arithmetic check available"}

Stay within K-5 classroom expectations and keep the answer practical for a parent helping at home.
Prioritize clarity on counting, place value, number bonds, regrouping, fractions, long division, decimals, multi-step word problems, area vs perimeter, measurement conversions, and beginning algebra patterns when relevant.${imageInstruction}${followUpInstruction}${priorAnswerInstruction}

${buildModeOutputReminder(mode)}`;
}

async function runModelCompletion({
  systemInstruction,
  prompt,
  image,
  contents,
}: {
  systemInstruction: string;
  prompt?: string;
  image?: string;
  contents?: any;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";

  const ai = new GoogleGenAI({ apiKey });

  let apiContents: any;
  if (contents) {
    apiContents = contents;
  } else {
    apiContents =
      image && image.includes(",")
        ? [
            {
              role: "user" as const,
              parts: [
                { text: prompt || "" },
                {
                  inlineData: {
                    data: image.split(",")[1],
                    mimeType: image.split(";")[0]?.split(":")[1] || "image/png",
                  },
                },
              ],
            },
          ]
        : prompt || "";
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: apiContents,
    config: {
      systemInstruction,
    },
  });

  return response.text?.trim() || "";
}

export async function analyzeChatTurn({
  latestQuery,
  history = [],
  hasImage = false,
}: {
  latestQuery: string;
  history?: SolveHistoryItem[];
  hasImage?: boolean;
}): Promise<{
  activeProblem: string;
  isNewProblem: boolean;
  followUpIntent: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      activeProblem: latestQuery,
      isNewProblem: true,
      followUpIntent: "",
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const historyText = history
    .map((item) => `${item.role === "user" ? "Parent" : "Assistant"}: ${item.text}`)
    .join("\n");

  const prompt = `You are an expert chat turn analyzer for an elementary K-5 math assistant app.
Your task is to analyze the parent's latest query in the context of the conversation history and classify it.

You must output a JSON object with these exact keys:
1. "activeProblem": The primary math problem currently being solved or discussed (e.g. "347 - 189" or "Sarah has 24 stickers..."). If the parent's latest query is starting/asking a brand new math problem, set this to the new math problem. If it is a follow-up question or discussion about the current math problem from the history, preserve the active problem from history.
2. "isNewProblem": Boolean. Set to true if the parent's latest query introduces a brand new math problem, a new worksheet question, or a new image. Set to false if the parent is asking a follow-up, requesting clarification on the prior response, expressing frustration, asking for simpler language, asking a "why" question about the steps, or requesting a teaching script/hands-on activity for the existing problem.
3. "followUpIntent": String. A brief summary of the user's specific follow-up query (e.g., "explain step 2", "adjust language to be simpler", "parent wants borrowing explanation", "parent is frustrated"). Leave empty if isNewProblem is true.

Conversation History:
${historyText}

Latest Parent Query:
"${latestQuery}"

Image Attached: ${hasImage ? "Yes" : "No"}

Output ONLY valid JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Analyze the chat turn. Respond only with JSON matching the schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            activeProblem: { type: "STRING" },
            isNewProblem: { type: "BOOLEAN" },
            followUpIntent: { type: "STRING" },
          },
          required: ["activeProblem", "isNewProblem", "followUpIntent"],
        },
        temperature: 0.0,
      },
    });

    const text = response.text?.trim() || "";
    const parsed = JSON.parse(text);
    return {
      activeProblem: parsed.activeProblem || latestQuery,
      isNewProblem: typeof parsed.isNewProblem === "boolean" ? parsed.isNewProblem : true,
      followUpIntent: parsed.followUpIntent || "",
    };
  } catch (err) {
    console.error("Error in analyzeChatTurn:", err);
    return {
      activeProblem: latestQuery,
      isNewProblem: true,
      followUpIntent: "",
    };
  }
}

export async function solveMathProblemPayload(
  {
    problem,
    userQuery,
    mode = "solver",
    image,
    history = [],
    priorAnswer = "",
    followUpIntent = "",
  }: {
    problem: string;
    userQuery?: string;
    mode?: SolveMode;
    image?: string;
    history?: SolveHistoryItem[];
    priorAnswer?: string;
    followUpIntent?: string;
  },
  deps: SolveRouteDependencies = {}
): Promise<SolveMathPayload> {
  const normalizedContext = typeof userQuery === "string" ? userQuery.trim() : "";

  if (!problem || typeof problem !== "string") {
    return { error: "Problem is required" };
  }

  // 1. Analyze the turn to see if it is a follow-up or a new problem
  const hasImage = Boolean(image);
  const analyzeTurn = deps.analyzeTurn ?? analyzeChatTurn;
  const analysis = await analyzeTurn({
    latestQuery: normalizedContext || problem,
    history,
    hasImage,
  });

  const activeProblem = analysis.activeProblem;
  const isNewProblem = analysis.isNewProblem;
  const resolvedFollowUpIntent = (retryCorrectAnswer?: string) => retryCorrectAnswer
    ? `The correct answer is ${retryCorrectAnswer}. Your solution steps MUST arrive at this exact answer.`
    : (analysis.followUpIntent || followUpIntent);

  const extractProblem = deps.extractProblem ?? extractCleanMath;
  // If it's a new problem, we normalize it using extractCleanMath.
  // Otherwise, we keep the active problem as is.
  const normalizedProblem = isNewProblem
    ? await extractProblem(activeProblem, normalizedContext)
    : activeProblem;

  const historyContext = history.map((item) => item.text).join(" ");
  const analysisText = `${normalizedProblem} ${normalizedContext} ${priorAnswer} ${historyContext}`.trim();
  const gradeBand = inferElementaryGradeBand(analysisText || normalizedProblem);
  const commonSkill = inferElementarySkill(analysisText || normalizedProblem);

  // Cache is ONLY used for fresh initial problems with no history
  const shouldUseCache = isNewProblem && !image && history.length === 0 && !priorAnswer && !followUpIntent;
  const cacheKey = shouldUseCache
    ? buildProblemHash(`${CONTENT_VERSION}::${mode}::${gradeBand}::${normalizedProblem}::${normalizedContext}`)
    : "";
  const cached = shouldUseCache ? getCachedSolution(cacheKey) : null;

  if (shouldUseCache && cached) {
    return {
      ...(cached as Omit<Extract<SolveMathPayload, { success: true }>, "cached">),
      cached: true,
    };
  }

  const complete = deps.complete ?? runModelCompletion;
  let generatedText = "";

  if (isNewProblem) {
    // A. Solve as a brand new math problem (Structured mode)
    const localSolution = solveArithmeticLocally(normalizedProblem);
    const runCompletion = (retryCorrectAnswer?: string) =>
      complete({
        systemInstruction: mode === "solver" ? mathSolverSystemPrompt : mathTutorSystemPrompt,
        prompt: buildCompletionPrompt({
          mode,
          problem: activeProblem,
          normalizedProblem,
          context: normalizedContext,
          history,
          gradeBand,
          commonSkill,
          localSolution,
          hasImage,
          priorAnswer: retryCorrectAnswer || priorAnswer,
          followUpIntent: resolvedFollowUpIntent(retryCorrectAnswer),
        }),
        image,
      });

    try {
      generatedText = await runCompletion();
    } catch (error) {
      console.error("K-5 solve completion failed:", error);
    }

    let solution = generatedText
      ? formatStructuredMathResponse(generatedText, mode, activeProblem)
      : buildOfflineSolution(activeProblem, mode, localSolution);
    let finalAnswer =
      extractSection(solution, "Final Answer") ||
      extractSection(solution, "Answer") ||
      localSolution?.answerText ||
      "";
    let verification = verifyElementaryAnswer(normalizedProblem, finalAnswer, localSolution?.answerText);

    // Auto-retry: if mathjs can verify, the LLM gave a real response, and the answer is wrong, retry once
    if (
      generatedText &&
      localSolution &&
      !verification.verified &&
      verification.verificationMethod === "arithmetic"
    ) {
      try {
        const retryText = await runCompletion(localSolution.answerText);
        if (retryText) {
          const retrySolution = formatStructuredMathResponse(retryText, mode, activeProblem);
          const retryFinalAnswer =
            extractSection(retrySolution, "Final Answer") ||
            extractSection(retrySolution, "Answer") ||
            localSolution.answerText;
          const retryVerification = verifyElementaryAnswer(normalizedProblem, retryFinalAnswer, localSolution.answerText);
          if (retryVerification.verified || retryVerification.verificationMethod !== "arithmetic") {
            generatedText = retryText;
            solution = retrySolution;
            finalAnswer = retryFinalAnswer;
            verification = retryVerification;
          }
        }
      } catch (retryError) {
        console.error("K-5 solve auto-retry failed:", retryError);
      }
    }

    const payload: Extract<SolveMathPayload, { success: true }> = {
      success: true,
      problem: activeProblem,
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

    if (shouldUseCache) {
      cacheSolution(cacheKey, payload);
    }
    return payload;
  } else {
    // B. Solve as a conversational follow-up (Dynamic Chat mode)
    // Build proper multi-turn contents array for Gemini
    const contents: any[] = [];
    for (const item of history) {
      contents.push({
        role: item.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: item.text }],
      });
    }

    // Append user's latest query to contents
    const userParts: any[] = [{ text: normalizedContext || problem }];
    if (image && image.includes(",")) {
      userParts.push({
        inlineData: {
          data: image.split(",")[1],
          mimeType: image.split(";")[0]?.split(":")[1] || "image/png",
        },
      });
    }
    contents.push({
      role: "user" as const,
      parts: userParts,
    });

    // Fallback string prompt for mocked complete implementations in unit tests
    const conversationalPromptText = `You are a helpful K-5 math assistant responding to a parent's follow-up question.
Active Problem being discussed: ${activeProblem}
Follow-up request: ${normalizedContext || problem}
Recent History:
${history.map(item => `${item.role}: ${item.text}`).join("\n")}
Directly and conversationally answer the parent. Keep it warm, coaching-focused, and simple. Do NOT output \`# Question\`, \`# Final Answer\`, etc.`;

    try {
      generatedText = await complete({
        systemInstruction: mode === "solver" ? mathSolverSystemPrompt : mathTutorSystemPrompt,
        prompt: conversationalPromptText,
        image,
        contents,
      });
    } catch (error) {
      console.error("K-5 chat completion failed:", error);
    }

    const solution = generatedText || "I'm sorry, I couldn't generate a response. Please try again.";

    return {
      success: true,
      problem: activeProblem,
      normalizedProblem,
      mode,
      gradeBand,
      solution,
      metadata: {
        mode,
        gradeBand,
        confidence: "high",
        validationPassed: true,
        commonSkill,
        hasPractice: false,
        status: "completed",
        source: generatedText ? "llm" : "offline",
        contentVersion: CONTENT_VERSION,
      },
    };
  }
}