export type ExtractionConfidence = "high" | "medium" | "low";

export type DeterministicExtraction = {
  confidence: ExtractionConfidence;
  requiredValues: string[];
  missingValues: string[];
  deterministicPath: string;
  extractedParameters: Record<string, number | number[]>;
  parameterConfidence: Record<string, ExtractionConfidence>;
  ambiguitySignals: string[];
};

function extractFirstNumber(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function hasDataset(text: string) {
  return /\[[^\]]+\]/.test(text) || /-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?){1,}/.test(text);
}

function extractDataset(text: string) {
  const bracketMatch = text.match(/\[([^\]]+)\]/);
  if (bracketMatch) {
    const values = bracketMatch[1]
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((value) => Number.isFinite(value));
    if (values.length > 0) return values;
  }
  const values = (text.match(/-?\d+(?:\.\d+)?/g) || [])
    .map((item) => Number(item))
    .filter((value) => Number.isFinite(value));
  return values.length > 1 ? values : [];
}

export function extractGeometryDeterministic(text: string): DeterministicExtraction {
  if (/cylinder/.test(text) && /volume|surface area/.test(text)) {
    const radiusLong = extractFirstNumber(text, /radius\s*(?:of|=)?\s*(-?\d+(?:\.\d+)?)/i);
    const radiusShort = extractFirstNumber(text, /\br\s*=\s*(-?\d+(?:\.\d+)?)/i);
    const radius = radiusLong ?? radiusShort;
    const heightLong = extractFirstNumber(text, /height\s*(?:of|=)?\s*(-?\d+(?:\.\d+)?)/i);
    const heightShort = extractFirstNumber(text, /\bh\s*=\s*(-?\d+(?:\.\d+)?)/i);
    const height = heightLong ?? heightShort;
    const requiredValues = ["radius", "height"];
    const missingValues = requiredValues.filter((value) =>
      value === "radius" ? radius === undefined : height === undefined
    );
    const ambiguitySignals: string[] = [];
    if (radiusLong !== undefined && radiusShort !== undefined && radiusLong !== radiusShort) {
      ambiguitySignals.push("radius_conflict");
    }
    if (heightLong !== undefined && heightShort !== undefined && heightLong !== heightShort) {
      ambiguitySignals.push("height_conflict");
    }
    return {
      confidence: ambiguitySignals.length > 0 ? "medium" : missingValues.length === 0 ? "high" : "medium",
      requiredValues,
      missingValues,
      deterministicPath: "geometry_cylinder_formulas",
      extractedParameters: {
        ...(radius !== undefined ? { radius } : {}),
        ...(height !== undefined ? { height } : {}),
      },
      parameterConfidence: {
        ...(radius !== undefined ? { radius: radiusLong !== undefined ? "high" : "medium" } : {}),
        ...(height !== undefined ? { height: heightLong !== undefined ? "high" : "medium" } : {}),
      },
      ambiguitySignals,
    };
  }

  if (/chord/.test(text)) {
    const radiusLong = extractFirstNumber(text, /radius\s*(?:of|=)?\s*(-?\d+(?:\.\d+)?)/i);
    const radiusShort = extractFirstNumber(text, /\br\s*=\s*(-?\d+(?:\.\d+)?)/i);
    const radius = radiusLong ?? radiusShort;
    const distanceLong = extractFirstNumber(
      text,
      /distance\s*(?:from\s*the\s*center\s*)?(?:of|=)?\s*(-?\d+(?:\.\d+)?)/i
    );
    const distanceInline = extractFirstNumber(text, /(-?\d+(?:\.\d+)?)\s*(?:cm|m|mm|units)?\s*from\s+the\s+center/i);
    const distanceFromCenter = distanceLong ?? distanceInline;
    const requiredValues = ["radius", "distance from the center"];
    const missingValues = requiredValues.filter((value) =>
      value === "radius" ? radius === undefined : distanceFromCenter === undefined
    );
    const ambiguitySignals: string[] = [];
    if (radiusLong !== undefined && radiusShort !== undefined && radiusLong !== radiusShort) {
      ambiguitySignals.push("radius_conflict");
    }
    if (distanceLong !== undefined && distanceInline !== undefined && distanceLong !== distanceInline) {
      ambiguitySignals.push("distance_from_center_conflict");
    }
    return {
      confidence: ambiguitySignals.length > 0 ? "medium" : missingValues.length === 0 ? "high" : "medium",
      requiredValues,
      missingValues,
      deterministicPath: "geometry_chord_formula",
      extractedParameters: {
        ...(radius !== undefined ? { radius } : {}),
        ...(distanceFromCenter !== undefined ? { distanceFromCenter } : {}),
      },
      parameterConfidence: {
        ...(radius !== undefined ? { radius: radiusLong !== undefined ? "high" : "medium" } : {}),
        ...(distanceFromCenter !== undefined
          ? { distanceFromCenter: distanceLong !== undefined ? "high" : "medium" }
          : {}),
      },
      ambiguitySignals,
    };
  }

  return {
    confidence: "medium",
    requiredValues: [],
    missingValues: [],
    deterministicPath: "geometry_rule_based",
    extractedParameters: {},
    parameterConfidence: {},
    ambiguitySignals: [],
  };
}

export function extractProbabilityDeterministic(text: string): DeterministicExtraction {
  if (/binomial|success|trial/.test(text)) {
    const n =
      extractFirstNumber(text, /\bn\s*=\s*(-?\d+(?:\.\d+)?)/i) ??
      extractFirstNumber(text, /(-?\d+(?:\.\d+)?)\s*trials?/i);
    const k =
      extractFirstNumber(text, /\bk\s*=\s*(-?\d+(?:\.\d+)?)/i) ??
      extractFirstNumber(text, /exactly\s*(-?\d+(?:\.\d+)?)/i);
    const p =
      extractFirstNumber(text, /\bp\s*=\s*(-?\d+(?:\.\d+)?)/i) ??
      extractFirstNumber(text, /probability\s*(?:of\s*success)?\s*(?:is|=)?\s*(-?\d+(?:\.\d+)?)/i);
    const requiredValues = ["n", "k", "p"];
    const missingValues = requiredValues.filter((value) =>
      value === "n" ? n === undefined : value === "k" ? k === undefined : p === undefined
    );
    return {
      confidence: missingValues.length === 0 ? "high" : "medium",
      requiredValues,
      missingValues,
      deterministicPath: "probability_binomial",
      extractedParameters: {
        ...(n !== undefined ? { n } : {}),
        ...(k !== undefined ? { k } : {}),
        ...(p !== undefined ? { p } : {}),
      },
      parameterConfidence: {
        ...(n !== undefined ? { n: "high" as const } : {}),
        ...(k !== undefined ? { k: "high" as const } : {}),
        ...(p !== undefined ? { p: "high" as const } : {}),
      },
      ambiguitySignals: [],
    };
  }

  return {
    confidence: "medium",
    requiredValues: [],
    missingValues: [],
    deterministicPath: "probability_rule_based",
    extractedParameters: {},
    parameterConfidence: {},
    ambiguitySignals: [],
  };
}

export function extractStatisticsDeterministic(text: string): DeterministicExtraction {
  const dataset = extractDataset(text);
  const requiredValues = ["dataset"];
  const missingValues = dataset.length > 0 && hasDataset(text) ? [] : requiredValues;
  return {
    confidence: missingValues.length === 0 ? "high" : "medium",
    requiredValues,
    missingValues,
    deterministicPath: "statistics_dataset_ops",
    extractedParameters: dataset.length > 0 ? { dataset } : {},
    parameterConfidence: dataset.length > 0 ? { dataset: hasDataset(text) ? "high" : "medium" } : {},
    ambiguitySignals: [],
  };
}

export function extractArithmeticDeterministic(text: string): DeterministicExtraction {
  const hasNumbers = /\d/.test(text);
  return {
    confidence: hasNumbers ? "high" : "low",
    requiredValues: [],
    missingValues: hasNumbers ? [] : ["expression"],
    deterministicPath: "arithmetic_sympify",
    extractedParameters: {},
    parameterConfidence: {},
    ambiguitySignals: [],
  };
}
