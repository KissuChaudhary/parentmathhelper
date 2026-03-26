import assert from "node:assert/strict";
import test from "node:test";
import { clearMathCache } from "../../lib/cache/math-cache";
import { solveMathProblemPayload } from "../../lib/math/solve-payload";

process.env.GEMINI_API_KEY = "";
process.env.DAYTONA_API_KEY = "";
process.env.DAYTONA_SNAPSHOT_NAME = "";

async function callSolveRoute(problem: string, output: string) {
  return solveMathProblemPayload(
    { problem },
    {
      interpreter: async ({ title, problemType, expectedOutput }) => ({
        success: true,
        title,
        problemType,
        output,
        expectedOutput,
        executionTime: new Date().toISOString(),
        runtime: "python",
      }),
    }
  );
}

function asSolvedPayload(payload: Awaited<ReturnType<typeof solveMathProblemPayload>>) {
  assert.equal("error" in payload, false);
  return payload as {
    success: boolean;
    solution: string;
    cached?: boolean;
  };
}

test("math solve route returns stable probability answer without debug leakage", async () => {
  clearMathCache();
  const problem =
    "A factory has 3 machines: Machine A, Machine B, and Machine C, producing 50%, 30%, and 20% of the total output, respectively. Machines A, B, and C produce defective items at rates of 1%, 2%, and 3%. If an item is selected randomly and found to be defective, what is the probability it came from Machine B?";

  const first = await callSolveRoute(problem, "6/17");
  const second = await callSolveRoute(problem, "999");

  const solvedFirst = asSolvedPayload(first);
  const solvedSecond = asSolvedPayload(second);
  assert.equal(solvedFirst.success, true);
  assert.equal(solvedFirst.solution, "6/17");
  assert.equal(solvedSecond.solution, "6/17");
  assert.equal(solvedSecond.cached, true);
  assert.equal(String(solvedFirst.solution).includes("Quality score"), false);
  assert.equal(String(solvedFirst.solution).includes("Extracted parameters"), false);
});

test("math solve route returns trig evaluation directly", async () => {
  clearMathCache();
  const payload = await callSolveRoute("If cos A = 2/5, find the value of 4 + 4 tan^2 A.", "25");

  const solvedPayload = asSolvedPayload(payload);
  assert.equal(solvedPayload.success, true);
  assert.equal(solvedPayload.solution, "25");
  assert.equal(String(solvedPayload.solution).includes("TRIGONOMETRY_PARSE_ERROR"), false);
});

test("math solve route keeps olympiad-style algebra prompt consistent", async () => {
  clearMathCache();
  const problem = "If a + 1/a = 3, then what is the value of a18 + a12 + a6 + 1?";

  const first = await callSolveRoute(problem, "0");
  const second = await callSolveRoute(problem, "999");

  const solvedFirst = asSolvedPayload(first);
  const solvedSecond = asSolvedPayload(second);
  assert.equal(solvedFirst.success, true);
  assert.equal(solvedFirst.solution, "0");
  assert.equal(solvedSecond.solution, "0");
  assert.equal(String(solvedFirst.solution).includes("PARSE_ERROR"), false);
  assert.equal(String(solvedFirst.solution).includes("Quality score"), false);
});
