"use client";

import { type MathVisualSpec, type FractionDiagramSpec, type GeometryDiagramSpec, type BoxPlotDiagramSpec } from "@/lib/math-visuals";

export function MathVisual({ spec }: { spec: MathVisualSpec }) {
  if (spec.kind === "fraction-diagram") {
    return <FractionDiagram spec={spec} />;
  }

  if (spec.kind === "geometry-diagram") {
    return <GeometryDiagram spec={spec} />;
  }

  return <BoxPlotDiagram spec={spec} />;
}

function FractionDiagram({ spec }: { spec: FractionDiagramSpec }) {
  return (
    <div className="my-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      {spec.title && <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-800">{spec.title}</div>}
      <div className="px-4 py-5">
        <div className="mx-auto flex max-w-md justify-center">
          {spec.variant === "bar" ? <FractionBar spec={spec} /> : <FractionCircle spec={spec} />}
        </div>
        <div className="mt-4 text-center">
          <div className="text-lg font-semibold text-zinc-900">
            {spec.labels?.numerator ?? spec.filledParts}
            <span className="mx-1 text-zinc-400">/</span>
            {spec.labels?.denominator ?? spec.parts}
          </div>
          {spec.labels?.caption && <p className="mt-1 text-sm text-zinc-500">{spec.labels.caption}</p>}
        </div>
      </div>
    </div>
  );
}

function FractionBar({ spec }: { spec: FractionDiagramSpec }) {
  return (
    <svg viewBox={`0 0 ${spec.parts * 42} 56`} className="w-full max-w-sm">
      {Array.from({ length: spec.parts }).map((_, index) => (
        <rect
          key={index}
          x={index * 42 + 1}
          y={8}
          width={40}
          height={40}
          rx={6}
          fill={index < spec.filledParts ? "#0f766e" : "#f4f4f5"}
          stroke="#27272a"
          strokeWidth="1.25"
        />
      ))}
    </svg>
  );
}

function FractionCircle({ spec }: { spec: FractionDiagramSpec }) {
  const center = 80;
  const radius = 60;
  const slices = Array.from({ length: spec.parts }).map((_, index) => {
    const startAngle = (index / spec.parts) * Math.PI * 2 - Math.PI / 2;
    const endAngle = ((index + 1) / spec.parts) * Math.PI * 2 - Math.PI / 2;
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
    const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    return { d, filled: index < spec.filledParts };
  });

  return (
    <svg viewBox="0 0 160 160" className="w-44">
      {slices.map((slice, index) => (
        <path key={index} d={slice.d} fill={slice.filled ? "#0f766e" : "#f4f4f5"} stroke="#27272a" strokeWidth="1.25" />
      ))}
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#27272a" strokeWidth="1.5" />
    </svg>
  );
}

function GeometryDiagram({ spec }: { spec: GeometryDiagramSpec }) {
  const width = spec.width ?? 320;
  const height = spec.height ?? 220;
  const normalizedPoints = normalizeGeometryPoints(spec.points, width, height);
  const pointsById = new Map(normalizedPoints.map((point) => [point.id, point]));
  const arrowMarkerId = `math-visual-arrow-${normalizedPoints.map((point) => point.id).join("-") || "shape"}`;

  return (
    <div className="my-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white ">
      {spec.title && <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-800">{spec.title}</div>}
      <div className="px-4 py-5">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          <defs>
            <marker id={arrowMarkerId} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#27272a" />
            </marker>
          </defs>

          {spec.polygons?.map((polygon, index) => (
            <polygon
              key={`polygon-${index}`}
              points={polygon.points
                .map((pointId) => pointsById.get(pointId))
                .filter(Boolean)
                .map((point) => `${point!.x},${point!.y}`)
                .join(" ")}
              fill={polygon.fill || "#dbeafe"}
              stroke="#1f2937"
              strokeWidth="2"
            />
          ))}

          {spec.segments?.map((segment, index) => {
            const from = pointsById.get(segment.from);
            const to = pointsById.get(segment.to);
            if (!from || !to) return null;
            return <line key={`segment-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#1f2937" strokeWidth="2.5" />;
          })}

          {spec.rays?.map((ray, index) => {
            const from = pointsById.get(ray.from);
            const to = pointsById.get(ray.to);
            if (!from || !to) return null;
            return (
              <line
                key={`ray-${index}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#1f2937"
                strokeWidth="2.5"
                markerEnd={`url(#${arrowMarkerId})`}
              />
            );
          })}

          {spec.highlightAngle && <AngleHighlight angle={spec.highlightAngle} pointsById={pointsById} />}

          {normalizedPoints.map((point) => (
            <g key={point.id}>
              <circle cx={point.x} cy={point.y} r="4.5" fill="#facc15" stroke="#1f2937" strokeWidth="1.5" />
              <text x={point.x + 8} y={point.y - 8} fontSize="14" fontWeight="700" fill="#111827">
                {point.label || point.id}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function normalizeGeometryPoints(points: GeometryDiagramSpec["points"], width: number, height: number) {
  if (points.length === 0) return points;

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xRange = Math.max(maxX - minX, 1);
  const yRange = Math.max(maxY - minY, 1);
  const padding = 30;
  const availableWidth = Math.max(width - padding * 2, 1);
  const availableHeight = Math.max(height - padding * 2, 1);

  return points.map((point) => ({
    ...point,
    x: padding + ((point.x - minX) / xRange) * availableWidth,
    y: padding + ((point.y - minY) / yRange) * availableHeight,
  }));
}

function AngleHighlight({
  angle,
  pointsById,
}: {
  angle: NonNullable<GeometryDiagramSpec["highlightAngle"]>;
  pointsById: Map<string, GeometryDiagramSpec["points"][number]>;
}) {
  const vertex = pointsById.get(angle.vertex);
  const from = pointsById.get(angle.from);
  const to = pointsById.get(angle.to);
  if (!vertex || !from || !to) return null;

  const radius = angle.radius ?? 28;
  const start = Math.atan2(from.y - vertex.y, from.x - vertex.x);
  let end = Math.atan2(to.y - vertex.y, to.x - vertex.x);
  while (end < start) {
    end += Math.PI * 2;
  }
  const largeArcFlag = end - start > Math.PI ? 1 : 0;
  const x1 = vertex.x + radius * Math.cos(start);
  const y1 = vertex.y + radius * Math.sin(start);
  const x2 = vertex.x + radius * Math.cos(end);
  const y2 = vertex.y + radius * Math.sin(end);
  const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  const midAngle = start + (end - start) / 2;
  const labelX = vertex.x + (radius + 16) * Math.cos(midAngle);
  const labelY = vertex.y + (radius + 16) * Math.sin(midAngle);

  return (
    <g>
      <path d={path} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
      {angle.label && (
        <text x={labelX} y={labelY} fontSize="13" fontWeight="700" textAnchor="middle" fill="#2563eb">
          {angle.label}
        </text>
      )}
    </g>
  );
}

function BoxPlotDiagram({ spec }: { spec: BoxPlotDiagramSpec }) {
  const values = [spec.minimum, spec.lowerQuartile, spec.median, spec.upperQuartile, spec.maximum];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const scale = (value: number) => 40 + ((value - min) / range) * 280;
  const boxStart = scale(spec.lowerQuartile);
  const boxEnd = scale(spec.upperQuartile);
  const medianX = scale(spec.median);
  const minX = scale(spec.minimum);
  const maxX = scale(spec.maximum);

  return (
    <div className="my-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      {spec.title && <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-800">{spec.title}</div>}
      <div className="px-4 py-5">
        <svg viewBox="0 0 360 170" className="w-full">
          <line x1={24} y1={120} x2={336} y2={120} stroke="#1d4ed8" strokeWidth="3" />
          <line x1={minX} y1={120} x2={boxStart} y2={120} stroke="#1d4ed8" strokeWidth="3" />
          <line x1={boxEnd} y1={120} x2={maxX} y2={120} stroke="#1d4ed8" strokeWidth="3" />
          <rect x={boxStart} y={78} width={Math.max(boxEnd - boxStart, 4)} height={42} rx={8} fill="#fdba74" stroke="#1e3a8a" strokeWidth="2" />
          <line x1={medianX} y1={78} x2={medianX} y2={120} stroke="#1e3a8a" strokeWidth="2" />
          {[spec.minimum, spec.lowerQuartile, spec.median, spec.upperQuartile, spec.maximum].map((value) => {
            const x = scale(value);
            return (
              <g key={value}>
                <line x1={x} y1={112} x2={x} y2={128} stroke="#1e3a8a" strokeWidth="2" />
                <rect x={x - 18} y={136} width={36} height={22} rx={6} fill="#eff6ff" stroke="#1e3a8a" />
                <text x={x} y={151} fontSize="11" fontWeight="700" textAnchor="middle" fill="#1e3a8a">
                  {value}
                </text>
              </g>
            );
          })}
          {spec.unitLabel && (
            <text x="336" y="68" fontSize="12" textAnchor="end" fill="#64748b">
              {spec.unitLabel}
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}
