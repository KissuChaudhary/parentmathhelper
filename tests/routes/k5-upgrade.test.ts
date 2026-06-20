import assert from "node:assert/strict";
import test from "node:test";
import { clearMathCache } from "../../lib/cache/math-cache";
import {
  inferElementarySkill,
  inferElementaryGradeBand,
  solveMathProblemPayload,
  analyzeChatTurn,
} from "../../lib/math/solve-payload";

process.env.GEMINI_API_KEY = "";

// ─────────────────────────────────────────────────────────
// inferElementarySkill — K-5 topics
// ─────────────────────────────────────────────────────────

test("inferElementarySkill detects place value", () => {
  assert.equal(inferElementarySkill("What is the tens digit in 482?"), "place value");
  assert.equal(inferElementarySkill("ones and hundreds"), "place value");
});

test("inferElementarySkill detects number bonds", () => {
  assert.equal(inferElementarySkill("number bonds to 10"), "number bonds");
  assert.equal(inferElementarySkill("What are the friends of 10?"), "number bonds");
  assert.equal(inferElementarySkill("making 10 with 7"), "number bonds");
});

test("inferElementarySkill detects skip counting", () => {
  assert.equal(inferElementarySkill("skip count by 5"), "skip counting");
  assert.equal(inferElementarySkill("counting by twos"), "skip counting");
});

test("inferElementarySkill detects counting", () => {
  assert.equal(inferElementarySkill("counting objects in a row"), "counting");
  assert.equal(inferElementarySkill("tally marks on the paper"), "counting");
});

test("inferElementarySkill detects shapes and geometry", () => {
  assert.equal(inferElementarySkill("how many sides does a triangle have?"), "shapes and geometry");
  assert.equal(inferElementarySkill("name the shape with 6 corners"), "shapes and geometry");
  assert.equal(inferElementarySkill("is a rectangle a square?"), "shapes and geometry");
});

test("inferElementarySkill detects comparing numbers", () => {
  assert.equal(inferElementarySkill("is 45 greater than 39?"), "comparing numbers");
  assert.equal(inferElementarySkill("which number is smaller"), "comparing numbers");
});

test("inferElementarySkill detects regrouping", () => {
  assert.equal(inferElementarySkill("how do I teach regrouping?"), "regrouping");
  assert.equal(inferElementarySkill("my child doesn't understand borrowing"), "regrouping");
  assert.equal(inferElementarySkill("carrying in addition"), "regrouping");
});

test("inferElementarySkill detects money with specific coins", () => {
  assert.equal(inferElementarySkill("pennies and dimes on the table"), "money");
  assert.equal(inferElementarySkill("count the quarters and nickels"), "money");
});

test("inferElementarySkill detects time with K-5 phrases", () => {
  assert.equal(inferElementarySkill("what is half past 3?"), "time");
  assert.equal(inferElementarySkill("quarter past seven"), "time");
  assert.equal(inferElementarySkill("show me 2 o'clock"), "time");
});

test("inferElementarySkill still detects existing skills", () => {
  assert.equal(inferElementarySkill("3/4 + 1/8"), "fractions");
  assert.equal(inferElementarySkill("long division 156 ÷ 12"), "long division");
  assert.equal(inferElementarySkill("25 + 17"), "addition");
  assert.equal(inferElementarySkill("32 - 17"), "subtraction");
  assert.equal(inferElementarySkill("6 times 7"), "multiplication");
  assert.equal(inferElementarySkill("how many apples are left?"), "word problems");
  assert.equal(inferElementarySkill("perimeter of the rectangle"), "area and perimeter");
  assert.equal(inferElementarySkill("3.5 + 2.7"), "decimals");
});

test("inferElementarySkill returns K-5 homework for vague input", () => {
  assert.equal(inferElementarySkill("help with homework"), "K-5 homework");
  assert.equal(inferElementarySkill("I don't understand"), "K-5 homework");
});

// ─────────────────────────────────────────────────────────
// inferElementaryGradeBand — K-5 bands
// ─────────────────────────────────────────────────────────

test("inferElementaryGradeBand returns K-2 for early elementary", () => {
  assert.equal(inferElementaryGradeBand("counting by fives"), "Grades K-2");
  assert.equal(inferElementaryGradeBand("number bonds to 10"), "Grades K-2");
  assert.equal(inferElementaryGradeBand("place value ones and tens"), "Grades K-2");
  assert.equal(inferElementaryGradeBand("name a shape with four sides"), "Grades K-2");
  assert.equal(inferElementaryGradeBand("regrouping in subtraction"), "Grades K-2");
});

test("inferElementaryGradeBand returns 2-4 for mid-elementary", () => {
  assert.equal(inferElementaryGradeBand("multiply 6 and 7"), "Grades 2-4");
  assert.equal(inferElementaryGradeBand("word problem with sharing"), "Grades 2-4");
});

test("inferElementaryGradeBand returns 3-5 for upper elementary", () => {
  assert.equal(inferElementaryGradeBand("long division with remainder"), "Grades 3-5");
  assert.equal(inferElementaryGradeBand("equivalent fractions"), "Grades 3-5");
  assert.equal(inferElementaryGradeBand("add 3/4 + 1/2"), "Grades 3-5");
  assert.equal(inferElementaryGradeBand("decimal addition"), "Grades 3-5");
});

test("inferElementaryGradeBand returns K-5 for generic input", () => {
  assert.equal(inferElementaryGradeBand("help me with homework"), "Grades K-5");
});

// ─────────────────────────────────────────────────────────
// formatStructuredMathResponse — Hands-On Activity preserved
// ─────────────────────────────────────────────────────────

test("Try together section is preserved in solver output", async () => {
  clearMathCache();
  const payload = await solveMathProblemPayload(
    { problem: "25 + 17", mode: "solver" },
    {
      extractProblem: async (input) => input,
      complete: async () =>
        `# Question\n25 + 17\n\n# Final Answer\n42\n\n# Solution Steps\n### Step 1\nAdd.\n$$\n25 + 17 = 42\n$$\n\n# Why This Works\n- Direct addition.\n\n# Common Mistake\n- Forgetting to carry.\n\n# 🎲 Try together\n- Use 25 pennies and 17 more pennies, then count them all.`,
    }
  );

  assert.equal("error" in payload, false);
  if (!("error" in payload)) {
    assert.equal(payload.solution.includes("# 🎲 Try together"), true);
    assert.equal(payload.solution.includes("pennies"), true);
  }
});

test("Try together section is auto-added when LLM omits it", async () => {
  clearMathCache();
  const payload = await solveMathProblemPayload(
    { problem: "10 + 5", mode: "solver" },
    {
      extractProblem: async (input) => input,
      complete: async () =>
        `# Question\n10 + 5\n\n# Final Answer\n15\n\n# Solution Steps\n### Step 1\nAdd.\n$$\n10 + 5 = 15\n$$\n\n# Why This Works\n- Simple addition.\n\n# Common Mistake\n- None likely.`,
    }
  );

  assert.equal("error" in payload, false);
  if (!("error" in payload)) {
    assert.equal(payload.solution.includes("# 🎲 Try together"), true);
  }
});

// ─────────────────────────────────────────────────────────
// Auto-retry on verification failure
// ─────────────────────────────────────────────────────────

test("auto-retry fires when LLM gets arithmetic wrong and corrects the answer", async () => {
  clearMathCache();
  let callCount = 0;

  const payload = await solveMathProblemPayload(
    { problem: "48 + 37", mode: "solver" },
    {
      extractProblem: async (input) => input,
      complete: async ({ prompt }) => {
        callCount++;
        if (callCount === 1) {
          // First call: LLM gets the answer wrong (says 83 instead of 85)
          return `# Question\n48 + 37\n\n# Final Answer\n83\n\n# Solution Steps\n### Step 1\nAdd.\n$$\n48 + 37 = 83\n$$\n\n# Why This Works\n- Addition.\n\n# Common Mistake\n- Forgetting to carry.`;
        }
        // Second call (retry): prompt should contain the correct answer
        assert.equal(prompt.includes("85"), true, "Retry prompt should contain correct answer 85");
        return `# Question\n48 + 37\n\n# Final Answer\n85\n\n# Solution Steps\n### Step 1\nAdd ones: 8 + 7 = 15, write 5 carry 1.\n$$\n8 + 7 = 15\n$$\n\n### Step 2\nAdd tens: 4 + 3 + 1 = 8.\n$$\n4 + 3 + 1 = 8\n$$\n\n# Why This Works\n- Carrying is correct.\n\n# Common Mistake\n- Forgetting to carry the 1.`;
      },
    }
  );

  assert.equal(callCount, 2, "Should have retried once");
  assert.equal("error" in payload, false);
  if (!("error" in payload)) {
    assert.equal(payload.metadata.validationPassed, true);
    assert.equal(payload.solution.includes("85"), true);
    assert.equal(payload.solution.includes("83"), false, "Wrong answer should not appear in final output");
  }
});

test("auto-retry does NOT fire when mathjs cannot verify (word problems)", async () => {
  clearMathCache();
  let callCount = 0;

  const payload = await solveMathProblemPayload(
    { problem: "Sally has 5 apples and gives 2 away. How many are left?", mode: "solver" },
    {
      extractProblem: async (input) => input,
      complete: async () => {
        callCount++;
        return `# Question\nSally has 5 apples and gives 2 away.\n\n# Final Answer\n3\n\n# Solution Steps\n### Step 1\nSubtract.\n$$\n5 - 2 = 3\n$$\n\n# Why This Works\n- Subtraction.\n\n# Common Mistake\n- Adding instead of subtracting.`;
      },
    }
  );

  assert.equal(callCount, 1, "Should NOT retry for word problems where mathjs can't parse");
  assert.equal("error" in payload, false);
});

test("auto-retry does NOT fire when the first answer is correct", async () => {
  clearMathCache();
  let callCount = 0;

  const payload = await solveMathProblemPayload(
    { problem: "12 + 8", mode: "solver" },
    {
      extractProblem: async (input) => input,
      complete: async () => {
        callCount++;
        return `# Question\n12 + 8\n\n# Final Answer\n20\n\n# Solution Steps\n### Step 1\nAdd.\n$$\n12 + 8 = 20\n$$\n\n# Why This Works\n- Simple addition.\n\n# Common Mistake\n- None likely.`;
      },
    }
  );

  assert.equal(callCount, 1, "Should NOT retry when answer is correct");
  assert.equal("error" in payload, false);
  if (!("error" in payload)) {
    assert.equal(payload.metadata.validationPassed, true);
  }
});

// ─────────────────────────────────────────────────────────
// Content version
// ─────────────────────────────────────────────────────────

test("content version is k5-v1", async () => {
  clearMathCache();
  const payload = await solveMathProblemPayload(
    { problem: "5 + 3", mode: "solver" },
    {
      extractProblem: async (input) => input,
      complete: async () =>
        `# Question\n5 + 3\n\n# Final Answer\n8\n\n# Solution Steps\n### Step 1\nAdd.\n$$\n5 + 3 = 8\n$$\n\n# Why This Works\n- Simple addition.\n\n# Common Mistake\n- None likely.`,
    }
  );

  assert.equal("error" in payload, false);
  if (!("error" in payload)) {
    assert.equal(payload.metadata.contentVersion, "k5-v1");
  }
});

// ─────────────────────────────────────────────────────────
// Agentic Chat & Conversational Turns
// ─────────────────────────────────────────────────────────

test("conversational turn does not force structured formatting", async () => {
  clearMathCache();
  const payload = await solveMathProblemPayload(
    {
      problem: "347 - 189",
      userQuery: "how do I explain borrowing?",
      mode: "solver",
      history: [
        { role: "user", text: "whats 347 - 189 my kid keeps gettin 258" },
        { role: "model", text: "# Question\n347 - 189\n\n# Final Answer\n158\n\n# Solution Steps\n..." },
      ],
    },
    {
      extractProblem: async (input) => input,
      analyzeTurn: async () => ({
        activeProblem: "347 - 189",
        isNewProblem: false,
        followUpIntent: "explain borrowing",
      }),
      complete: async ({ prompt, contents }) => {
        assert.ok(contents, "Contents array should be passed for conversational turns");
        assert.equal(contents.length, 3, "Contents should have 3 turns (1 history user, 1 history model, 1 new query)");
        return "To explain borrowing to your child, try this...";
      },
    }
  );

  assert.equal("error" in payload, false);
  if (!("error" in payload)) {
    assert.equal(payload.solution.includes("To explain borrowing"), true);
    assert.equal(payload.solution.includes("# Question"), false, "Conversational responses should not force-append structured sections");
    assert.equal(payload.solution.includes("# Final Answer"), false, "Conversational responses should not force-append structured sections");
    assert.equal(payload.problem, "347 - 189", "Active problem should be preserved from history");
  }
});

