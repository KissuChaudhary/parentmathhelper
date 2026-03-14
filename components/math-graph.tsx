"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import * as math from "mathjs";

interface MathGraphProps {
  expression: string;
  domain?: [number, number];
  points?: number;
  annotations?: { x: number; y: number; label: string }[];
}

export function MathGraph({
  expression,
  domain = [-10, 10],
  points = 100,
  annotations = [],
}: MathGraphProps) {
  const data = useMemo(() => {
    try {
      const node = math.parse(expression);
      const compiled = node.compile();
      const step = (domain[1] - domain[0]) / points;
      const result = [];

      for (let x = domain[0]; x <= domain[1]; x += step) {
        try {
          const y = compiled.evaluate({ x });
          if (typeof y === "number" && !isNaN(y) && isFinite(y)) {
            result.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
          }
        } catch (e) {
          // Ignore evaluation errors for specific points
        }
      }
      return result;
    } catch (e) {
      console.error("Failed to parse or evaluate expression:", e);
      return [];
    }
  }, [expression, domain, points]);

  if (data.length === 0) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
        Could not render graph for expression: {expression}
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-zinc-200 rounded-xl p-4 my-4 shadow-sm">
      <div className="text-sm font-semibold text-zinc-800 mb-4 text-center font-mono bg-zinc-50 py-1.5 rounded-md">
        y = {expression}
      </div>
      <div className="h-[250px] sm:h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#f4f4f5" vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              domain={domain}
              tick={{ fontSize: 11, fill: "#a1a1aa", fontWeight: 500 }}
              tickCount={11}
              axisLine={{ stroke: '#e4e4e7', strokeWidth: 2 }}
              tickLine={{ stroke: '#e4e4e7' }}
              tickMargin={8}
            />
            <YAxis
              type="number"
              domain={["auto", "auto"]}
              tick={{ fontSize: 11, fill: "#a1a1aa", fontWeight: 500 }}
              axisLine={{ stroke: '#e4e4e7', strokeWidth: 2 }}
              tickLine={{ stroke: '#e4e4e7' }}
              tickMargin={8}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderRadius: "12px",
                border: "1px solid #e4e4e7",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                padding: "8px 12px"
              }}
              labelStyle={{ color: "#52525b", fontWeight: 600, marginBottom: "4px" }}
              itemStyle={{ color: "#0ea5e9", fontWeight: 600 }}
              formatter={(value: any) => [value, "y"]}
              labelFormatter={(label: any) => `x: ${label}`}
            />
            <ReferenceLine x={0} stroke="#d4d4d8" strokeWidth={2} />
            <ReferenceLine y={0} stroke="#d4d4d8" strokeWidth={2} />
            {annotations.map((ann, i) => (
              <ReferenceDot
                key={i}
                x={ann.x}
                y={ann.y}
                r={6}
                fill="#f43f5e"
                stroke="#fff"
                strokeWidth={2}
                label={{ position: 'top', value: ann.label, fill: '#f43f5e', fontSize: 14, fontWeight: 600, offset: 10 }}
              />
            ))}
            <Line
              type="monotone"
              dataKey="y"
              stroke="#0ea5e9"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 8, fill: "#0ea5e9", stroke: "#fff", strokeWidth: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
