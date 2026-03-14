import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface DataChartProps {
  type: 'bar' | 'line' | 'pie';
  data: any[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  title?: string;
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function DataChart({ type, data, xKey, yKeys, colors = DEFAULT_COLORS, title }: DataChartProps) {
  if (!data || data.length === 0) {
    return <div className="p-4 text-center text-zinc-500 bg-zinc-50 rounded-lg">No data available for chart</div>;
  }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f4f4f5" />
            <XAxis dataKey={xKey} tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }} axisLine={{ stroke: '#e4e4e7', strokeWidth: 2 }} tickLine={{ stroke: '#e4e4e7' }} tickMargin={8} />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }} axisLine={{ stroke: '#e4e4e7', strokeWidth: 2 }} tickLine={{ stroke: '#e4e4e7' }} tickMargin={8} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
              cursor={{ fill: '#f4f4f5' }}
              labelStyle={{ color: "#52525b", fontWeight: 600, marginBottom: "4px" }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
            {yKeys.map((key, index) => (
              <Bar key={key} dataKey={key} fill={colors[index % colors.length]} radius={[6, 6, 0, 0]} />
            ))}
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f4f4f5" />
            <XAxis dataKey={xKey} tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }} axisLine={{ stroke: '#e4e4e7', strokeWidth: 2 }} tickLine={{ stroke: '#e4e4e7' }} tickMargin={8} />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }} axisLine={{ stroke: '#e4e4e7', strokeWidth: 2 }} tickLine={{ stroke: '#e4e4e7' }} tickMargin={8} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
              labelStyle={{ color: "#52525b", fontWeight: 600, marginBottom: "4px" }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
            {yKeys.map((key, index) => (
              <Line key={key} type="monotone" dataKey={key} stroke={colors[index % colors.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
            ))}
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
              itemStyle={{ fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey={yKeys[0]}
              nameKey={xKey}
              label={({ name, percent }) => percent !== undefined ? `${name} ${(percent * 100).toFixed(0)}%` : name}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        );
      default:
        return null;
    }
  };

  return (
    <div className="my-4 p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
      {title && <h4 className="text-center font-semibold text-zinc-800 mb-4 text-base">{title}</h4>}
      <div className="h-[250px] sm:h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
