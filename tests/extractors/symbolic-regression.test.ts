import assert from "node:assert/strict";
import test from "node:test";
import { buildSympyCode } from "../../lib/math/code-templates";
import { inferDeterministicProfile, inferProblemType } from "../../lib/math/sympy-utils";

test("probability bayes question computes posterior for machine B", async () => {
  const problem =
    "A factory has 3 machines: Machine A, Machine B, and Machine C, producing 50%, 30%, and 20% of the total output, respectively. Machines A, B, and C produce defective items at rates of 1%, 2%, and 3%. If an item is selected randomly and found to be defective, what is the probability it came from Machine B?";
  const problemType = inferProblemType(problem);
  const profile = inferDeterministicProfile(problem);
  const code = buildSympyCode(problem, problemType);
  assert.equal(problemType, "probability");
  assert.equal(profile.deterministicPath, "probability_rule_based");
  assert.equal(profile.qualityScore >= 55, true);
  assert.ok(code.includes('if "machine" in lower and "defect" in lower and "from machine" in lower'));
  assert.ok(code.includes("posterior = simplify"));
});

test("trigonometry condition with cosA evaluates expression", () => {
  const problem = "If cos A = 2/5, find the value of 4 + 4 tan^2 A.";
  const problemType = inferProblemType(problem);
  const code = buildSympyCode(problem, problemType);
  assert.equal(problemType, "trigonometry");
  assert.ok(code.includes("condition_match = re.search"));
  assert.ok(code.includes("tan(var_symbol)"));
  assert.ok(code.includes("TRIGONOMETRY_PARSE_ERROR"));
});

test("algebra identity expression with condition simplifies correctly", () => {
  const problem =
    "If a + b + c = 3, then the value of 1/(1-a)(1-b) + 1/(1-b)(1-c) + 1/(1-c)(1-a)";
  const problemType = inferProblemType(problem);
  const code = buildSympyCode(problem, problemType);
  assert.equal(problemType, "algebra");
  assert.ok(code.includes("cleaned = re.sub(r\"\\)\\s*\\(\", r\")*(\", cleaned)"));
  assert.ok(code.includes("condition_match = re.search"));
  assert.ok(code.includes("ALGEBRA_PARSE_ERROR"));
});
