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
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Lines of Code History
      </h3>
      <div className="min-h-72 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorLoc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
            />
            <XAxis
              dataKey="date"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
              tick={{ fill: '#6b7280' }}
              className="dark:[&>text]:fill-gray-400"
            />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#6b7280' }}
              className="dark:[&>text]:fill-gray-400"
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                backgroundColor: '#ffffff',
              }}
              wrapperStyle={{
                backgroundColor: 'transparent',
              }}
              labelStyle={{
                color: '#111827',
              }}
              itemStyle={{
                color: '#111827',
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
