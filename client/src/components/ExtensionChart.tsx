import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ExtensionChartProps {
  extensions: Record<string, number>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export const ExtensionChart: React.FC<ExtensionChartProps> = ({ extensions }) => {
  const data = Object.entries(extensions)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">File Types</h3>
      <div className="min-h-64 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
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
            />
            <Legend
              wrapperStyle={{
                color: '#6b7280',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
