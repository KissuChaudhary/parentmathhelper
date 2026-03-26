export type GoldenCase = {
  name: string;
  input: string;
  expectedPath: string;
  expectedMissingValues: string[];
  expectedCanExecute: boolean;
};

export const geometryGoldenCases: GoldenCase[] = [
  {
    name: "geometry cylinder with explicit radius and height",
    input: "Find the volume of a cylinder with radius = 7 and height = 10",
    expectedPath: "geometry_cylinder_formulas",
    expectedMissingValues: [],
    expectedCanExecute: true,
  },
  {
    name: "geometry cylinder missing height",
    input: "Find the volume of a cylinder with radius = 7",
    expectedPath: "geometry_cylinder_formulas",
    expectedMissingValues: ["height"],
    expectedCanExecute: false,
  },
  {
    name: "geometry chord with complete values",
    input: "In a circle radius 10, find chord length 6 cm from the center",
    expectedPath: "geometry_chord_formula",
    expectedMissingValues: [],
    expectedCanExecute: true,
  },
];

export const probabilityGoldenCases: GoldenCase[] = [
  {
    name: "probability binomial with n k p",
    input: "Find binomial probability with n = 10, k = 3, p = 0.4",
    expectedPath: "probability_binomial",
    expectedMissingValues: [],
    expectedCanExecute: true,
  },
  {
    name: "probability binomial missing p",
    input: "Find binomial probability with n = 10 and k = 3",
    expectedPath: "probability_binomial",
    expectedMissingValues: ["p"],
    expectedCanExecute: false,
  },
];

export const statisticsGoldenCases: GoldenCase[] = [
  {
    name: "statistics dataset mean",
    input: "Find mean of [12, 15, 21, 19]",
    expectedPath: "statistics_dataset_ops",
    expectedMissingValues: [],
    expectedCanExecute: true,
  },
  {
    name: "statistics missing dataset",
    input: "Find the mean",
    expectedPath: "statistics_dataset_ops",
    expectedMissingValues: ["dataset"],
    expectedCanExecute: false,
  },
];

export const arithmeticGoldenCases: GoldenCase[] = [
  {
    name: "arithmetic expression with numbers",
    input: "Compute (12 + 8) * 3",
    expectedPath: "arithmetic_sympify",
    expectedMissingValues: [],
    expectedCanExecute: true,
  },
  {
    name: "non-numeric compute falls back to general symbolic",
    input: "Compute this expression",
    expectedPath: "sympy_general",
    expectedMissingValues: [],
    expectedCanExecute: true,
  },
];
