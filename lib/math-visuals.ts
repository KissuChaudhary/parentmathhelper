import { Type, type FunctionDeclaration } from "@google/genai";

export type FractionDiagramSpec = {
  kind: "fraction-diagram";
  title?: string;
  variant: "bar" | "circle";
  parts: number;
  filledParts: number;
  labels?: {
    numerator?: string;
    denominator?: string;
    caption?: string;
  };
};

export type GeometryPoint = {
  id: string;
  x: number;
  y: number;
  label?: string;
};

export type GeometrySegment = {
  from: string;
  to: string;
};

export type GeometryRay = {
  from: string;
  to: string;
};

export type GeometryPolygon = {
  points: string[];
  fill?: string;
};

export type GeometryAngle = {
  vertex: string;
  from: string;
  to: string;
  label?: string;
  radius?: number;
};

export type GeometryDiagramSpec = {
  kind: "geometry-diagram";
  title?: string;
  width?: number;
  height?: number;
  points: GeometryPoint[];
  segments?: GeometrySegment[];
  rays?: GeometryRay[];
  polygons?: GeometryPolygon[];
  highlightAngle?: GeometryAngle;
};

export type BoxPlotDiagramSpec = {
  kind: "box-plot-diagram";
  title?: string;
  minimum: number;
  lowerQuartile: number;
  median: number;
  upperQuartile: number;
  maximum: number;
  unitLabel?: string;
};

export type MathVisualSpec = FractionDiagramSpec | GeometryDiagramSpec | BoxPlotDiagramSpec;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isGeometryPoint(value: unknown): value is GeometryPoint {
  return isRecord(value) && isString(value.id) && isNumber(value.x) && isNumber(value.y) && (!("label" in value) || isString(value.label));
}

function isGeometrySegment(value: unknown): value is GeometrySegment {
  return isRecord(value) && isString(value.from) && isString(value.to);
}

function isGeometryPolygon(value: unknown): value is GeometryPolygon {
  return isRecord(value) && isStringArray(value.points) && (!("fill" in value) || isString(value.fill));
}

function isGeometryAngle(value: unknown): value is GeometryAngle {
  return (
    isRecord(value) &&
    isString(value.vertex) &&
    isString(value.from) &&
    isString(value.to) &&
    (!("label" in value) || isString(value.label)) &&
    (!("radius" in value) || isNumber(value.radius))
  );
}

function isFractionDiagramSpec(value: unknown): value is FractionDiagramSpec {
  return (
    isRecord(value) &&
    value.kind === "fraction-diagram" &&
    (value.variant === "bar" || value.variant === "circle") &&
    isNumber(value.parts) &&
    isNumber(value.filledParts) &&
    value.parts > 0 &&
    value.filledParts >= 0 &&
    value.filledParts <= value.parts
  );
}

function isGeometryDiagramSpec(value: unknown): value is GeometryDiagramSpec {
  return (
    isRecord(value) &&
    value.kind === "geometry-diagram" &&
    Array.isArray(value.points) &&
    value.points.every(isGeometryPoint) &&
    (!("segments" in value) || (Array.isArray(value.segments) && value.segments.every(isGeometrySegment))) &&
    (!("rays" in value) || (Array.isArray(value.rays) && value.rays.every(isGeometrySegment))) &&
    (!("polygons" in value) || (Array.isArray(value.polygons) && value.polygons.every(isGeometryPolygon))) &&
    (!("highlightAngle" in value) || isGeometryAngle(value.highlightAngle))
  );
}

function isBoxPlotDiagramSpec(value: unknown): value is BoxPlotDiagramSpec {
  return (
    isRecord(value) &&
    value.kind === "box-plot-diagram" &&
    isNumber(value.minimum) &&
    isNumber(value.lowerQuartile) &&
    isNumber(value.median) &&
    isNumber(value.upperQuartile) &&
    isNumber(value.maximum)
  );
}

export function isMathVisualSpec(value: unknown): value is MathVisualSpec {
  return isFractionDiagramSpec(value) || isGeometryDiagramSpec(value) || isBoxPlotDiagramSpec(value);
}

export function parseMathVisualSpec(value: unknown): MathVisualSpec | null {
  if (isMathVisualSpec(value)) return value;
  return null;
}

export const createFractionDiagramTool: FunctionDeclaration = {
  name: "create_fraction_diagram",
  description:
    "Creates a simple fraction teaching visual for Grades 3-6, such as a shaded bar model or circle model.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      kind: { type: Type.STRING, enum: ["fraction-diagram"] },
      title: { type: Type.STRING },
      variant: { type: Type.STRING, enum: ["bar", "circle"] },
      parts: { type: Type.NUMBER },
      filledParts: { type: Type.NUMBER },
      labels: {
        type: Type.OBJECT,
        properties: {
          numerator: { type: Type.STRING },
          denominator: { type: Type.STRING },
          caption: { type: Type.STRING },
        },
      },
    },
    required: ["kind", "variant", "parts", "filledParts"],
  },
};

export const createGeometryDiagramTool: FunctionDeclaration = {
  name: "create_geometry_diagram",
  description:
    "Creates a clean labeled geometry diagram using points, rays, segments, polygons, and one optional highlighted angle.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      kind: { type: Type.STRING, enum: ["geometry-diagram"] },
      title: { type: Type.STRING },
      width: { type: Type.NUMBER },
      height: { type: Type.NUMBER },
      points: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            x: { type: Type.NUMBER },
            y: { type: Type.NUMBER },
            label: { type: Type.STRING },
          },
          required: ["id", "x", "y"],
        },
      },
      segments: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            from: { type: Type.STRING },
            to: { type: Type.STRING },
          },
          required: ["from", "to"],
        },
      },
      rays: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            from: { type: Type.STRING },
            to: { type: Type.STRING },
          },
          required: ["from", "to"],
        },
      },
      polygons: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            points: { type: Type.ARRAY, items: { type: Type.STRING } },
            fill: { type: Type.STRING },
          },
          required: ["points"],
        },
      },
      highlightAngle: {
        type: Type.OBJECT,
        properties: {
          vertex: { type: Type.STRING },
          from: { type: Type.STRING },
          to: { type: Type.STRING },
          label: { type: Type.STRING },
          radius: { type: Type.NUMBER },
        },
        required: ["vertex", "from", "to"],
      },
    },
    required: ["kind", "points"],
  },
};

export const createBoxPlotDiagramTool: FunctionDeclaration = {
  name: "create_box_plot_diagram",
  description: "Creates a simple five-number-summary box plot teaching visual.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      kind: { type: Type.STRING, enum: ["box-plot-diagram"] },
      title: { type: Type.STRING },
      minimum: { type: Type.NUMBER },
      lowerQuartile: { type: Type.NUMBER },
      median: { type: Type.NUMBER },
      upperQuartile: { type: Type.NUMBER },
      maximum: { type: Type.NUMBER },
      unitLabel: { type: Type.STRING },
    },
    required: ["kind", "minimum", "lowerQuartile", "median", "upperQuartile", "maximum"],
  },
};
