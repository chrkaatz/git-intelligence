import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface LocChartProps {
  data: { date: string; loc: number }[];
}

export const LocChart: React.FC<LocChartProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Lines of Code History</h3>
      <div className="min-h-72 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorLoc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <Area
              type="monotone"
              dataKey="loc"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorLoc)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
