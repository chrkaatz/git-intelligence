import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ActivityStats } from '../api';

interface ActivityChartProps {
  activity: ActivityStats;
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ activity }) => {
  const hourData = Object.entries(activity.hourOfDay).map(([hour, count]) => ({
    name: `${hour}:00`,
    commits: count,
  }));

  const dayData = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => ({
    name: day,
    commits: activity.dayOfWeek[index] || 0,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Activity by Hour
        </h3>
        <div className="min-h-64 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
                className="dark:stroke-gray-700"
              />
              <XAxis
                dataKey="name"
                fontSize={12}
                tickLine={false}
                axisLine={false}
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
                cursor={{ fill: '#f3f4f6' }}
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
              <Bar dataKey="commits" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Activity by Day
        </h3>
        <div className="min-h-64 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
                className="dark:stroke-gray-700"
              />
              <XAxis
                dataKey="name"
                fontSize={12}
                tickLine={false}
                axisLine={false}
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
                cursor={{ fill: '#f3f4f6' }}
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
              <Bar dataKey="commits" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
