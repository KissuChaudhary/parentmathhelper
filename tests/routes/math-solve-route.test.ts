import assert from "node:assert/strict";
import test from "node:test";
import { clearMathCache } from "../../lib/cache/math-cache";
import { solveMathProblemPayload } from "../../lib/math/solve-payload";

process.env.GEMINI_API_KEY = "";

async function callSolveRoute(problem: string, mode: "solver" | "tutor" = "solver") {
  return solveMathProblemPayload(
    { problem, mode },
    {
      extractProblem: async (input) => input.replace(/^please help me /i, "").trim(),
      complete: async ({ systemInstruction }) =>
        systemInstruction.includes("parent coach")
          ? `# What The Child Needs To Understand
This is a fraction problem. The child needs to rename the fractions so they share the same denominator before adding.

# How To Explain It
Tell your child both fractions must be cut into the same size pieces before the numerators can be added.

# Solution Steps
### Step 1
Rename the larger fraction with a common denominator.
$$
3/4 = 6/8
$$
> Teaching Tip: Say, "We want both fractions to use eighths."

### Step 2
Add the numerators now that the pieces match.
$$
6/8 + 1/8 = 7/8
$$
> Teaching Tip: Ask, "How many eighths do we have altogether?"

# Common Mistake
- Adding the top and bottom numbers separately

# Practice Together
- Try 1/2 + 1/4.
- Praise careful thinking, not just speed.`
          : `# Question
${problem}

# Final Answer
7/8

# Solution Steps
### Step 1
Rename the first fraction with a common denominator.
$$
3/4 = 6/8
$$

### Step 2
Add the numerators.
$$
6/8 + 1/8 = 7/8
$$

# Why This Works
- Fractions must name the same-size parts before adding.
- Only the numerators change once the denominator matches.

# Common Mistake
- Adding the denominators too`,
    }
  );
}

function asSolvedPayload(payload: Awaited<ReturnType<typeof solveMathProblemPayload>>) {
  assert.equal("error" in payload, false);
  return payload as {
    success: boolean;
    solution: string;
    cached?: boolean;
    normalizedProblem: string;
    gradeBand: string;
    metadata: {
      mode: "solver" | "tutor";
      validationPassed: boolean;
      commonSkill: string;
      source: "llm" | "offline";
    };
  };
}

test("math solve route returns structured solver markdown and caches by normalized prompt", async () => {
  clearMathCache();
  const problem = "Please help me solve 3/4 + 1/8";

  const first = await callSolveRoute(problem);
  const second = await callSolveRoute(problem);

  const solvedFirst = asSolvedPayload(first);
  const solvedSecond = asSolvedPayload(second);
  assert.equal(solvedFirst.success, true);
  assert.equal(solvedFirst.solution.includes("# Final Answer"), true);
  assert.equal(solvedFirst.solution.includes("7/8"), true);
  assert.equal(solvedFirst.metadata.mode, "solver");
  assert.equal(solvedFirst.metadata.validationPassed, true);
  assert.equal(solvedFirst.metadata.commonSkill, "fractions");
  assert.equal(solvedFirst.gradeBand, "Grades 4-6");
  assert.equal(solvedFirst.normalizedProblem, "solve 3/4 + 1/8");
  assert.equal(solvedSecond.cached, true);
  assert.equal(String(solvedFirst.solution).includes("SymPy"), false);
  assert.equal(String(solvedFirst.solution).includes("Python"), false);
});

test("math solve route returns tutor structure for parent coaching", async () => {
  clearMathCache();
  const payload = await callSolveRoute("How do I explain 3/4 + 1/8 to my child?", "tutor");

  const solvedPayload = asSolvedPayload(payload);
  assert.equal(solvedPayload.success, true);
  assert.equal(solvedPayload.metadata.mode, "tutor");
  assert.equal(solvedPayload.solution.includes("# What The Child Needs To Understand"), true);
  assert.equal(solvedPayload.solution.includes("# Practice Together"), true);
});

test("math solve route falls back to offline arithmetic when no model is injected", async () => {
  clearMathCache();
  const payload = await solveMathProblemPayload({ problem: "12.5 + 7.5" });
  const solvedPayload = asSolvedPayload(payload);
  assert.equal(solvedPayload.success, true);
  assert.equal(solvedPayload.metadata.source, "offline");
  assert.equal(solvedPayload.metadata.validationPassed, true);
  assert.equal(solvedPayload.solution.includes("20"), true);
});
