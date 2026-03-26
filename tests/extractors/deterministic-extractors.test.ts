import assert from "node:assert/strict";
import test from "node:test";
import { evaluateDeterministicReadiness, inferDeterministicProfile } from "../../lib/math/sympy-utils";
import {
  arithmeticGoldenCases,
  geometryGoldenCases,
  probabilityGoldenCases,
  statisticsGoldenCases,
  type GoldenCase,
} from "./golden-cases";

function runGoldenCase(goldenCase: GoldenCase) {
  const profile = inferDeterministicProfile(goldenCase.input);
  const readiness = evaluateDeterministicReadiness(profile);
  assert.equal(profile.deterministicPath, goldenCase.expectedPath);
  assert.deepEqual(profile.missingValues, goldenCase.expectedMissingValues);
  assert.equal(readiness.canExecute, goldenCase.expectedCanExecute);
  assert.ok(profile.qualityScore >= 0 && profile.qualityScore <= 100);
}

test("geometry golden cases", () => {
  geometryGoldenCases.forEach(runGoldenCase);
});

test("probability golden cases", () => {
  probabilityGoldenCases.forEach(runGoldenCase);
});

test("statistics golden cases", () => {
  statisticsGoldenCases.forEach(runGoldenCase);
});

test("arithmetic golden cases", () => {
  arithmeticGoldenCases.forEach(runGoldenCase);
});

test("ambiguity blocks deterministic execution", () => {
  const profile = inferDeterministicProfile(
    "Cylinder volume with radius = 7 and r = 8 and height = 10"
  );
  const readiness = evaluateDeterministicReadiness(profile);
  assert.equal(profile.deterministicPath, "geometry_cylinder_formulas");
  assert.ok(profile.ambiguitySignals.includes("radius_conflict"));
  assert.equal(readiness.canExecute, false);
});
