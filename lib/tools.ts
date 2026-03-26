import { Type, FunctionDeclaration } from "@google/genai";

export const solveComplexMathTool: FunctionDeclaration = {
  name: "solve_complex_math",
  description: "Use this tool when the user provides a specific math equation or word problem that requires step-by-step solving.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      plain_english_translation: {
        type: Type.STRING,
        description: "A 1-2 sentence 'Plain English Translation' of what the problem is actually asking.",
      },
      analogy: {
        type: Type.STRING,
        description: "A real-world physical analogy for the abstract concept.",
      },
      solution_steps: {
        type: Type.ARRAY,
        description: "The step-by-step solution to the math problem.",
        items: {
          type: Type.OBJECT,
          properties: {
            explanation: {
              type: Type.STRING,
              description: "Explanation of the step.",
            },
            math_latex: {
              type: Type.STRING,
              description: "The mathematical equation for this step in LaTeX format (without $ signs).",
            },
            teaching_tip: {
              type: Type.STRING,
              description: "A specific tip for the parent to help teach this step.",
            },
          },
          required: ["explanation", "math_latex", "teaching_tip"],
        },
      },
      graph: {
        type: Type.OBJECT,
        description: "An optional interactive graph to visualize a function or equation.",
        properties: {
          expression: { type: Type.STRING },
          domain: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          points: { type: Type.NUMBER },
          annotations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                label: { type: Type.STRING },
              },
            },
          },
        },
        required: ["expression", "domain", "points"],
      },
      chart: {
        type: Type.OBJECT,
        description: "An optional interactive chart to present data, comparisons, or statistics.",
        properties: {
          type: { type: Type.STRING, description: "Type of chart: 'bar', 'line', or 'pie'" },
          title: { type: Type.STRING },
          data: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                value: { type: Type.NUMBER },
              },
            },
          },
          xKey: { type: Type.STRING },
          yKeys: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["type", "title", "data", "xKey", "yKeys"],
      },
    },
    required: ["plain_english_translation", "analogy", "solution_steps"],
  },
};

export const simpleConceptExplanationTool: FunctionDeclaration = {
  name: "simple_concept_explanation",
  description: "Use this tool to explain simple mathematical concepts, definitions, or answer general questions without forcing a rigid step-by-step math template.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      explanation: {
        type: Type.STRING,
        description: "A conversational, easy-to-understand explanation of the concept. Use markdown for formatting.",
      },
      analogy: {
        type: Type.STRING,
        description: "An optional real-world physical analogy to help bridge the understanding gap.",
      },
      example: {
        type: Type.STRING,
        description: "An optional brief example illustrating the concept.",
      },
    },
    required: ["explanation"],
  },
};

export const generateAnalogyTool: FunctionDeclaration = {
  name: "generate_analogy",
  description: "Use this tool to provide a real-world physical analogy for an abstract mathematical concept.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      concept: {
        type: Type.STRING,
        description: "The abstract concept needing an analogy.",
      },
      analogy: {
        type: Type.STRING,
        description: "A creative, relatable analogy to help bridge the understanding gap.",
      },
      how_it_applies: {
        type: Type.STRING,
        description: "A brief explanation of how the analogy applies to the mathematical concept.",
      },
    },
    required: ["concept", "analogy", "how_it_applies"],
  },
};
