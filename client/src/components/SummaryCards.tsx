import React from 'react';
import { GitCommit, Users, FileCode } from 'lucide-react';
import type { GitStats } from '../api';

interface SummaryCardsProps {
  stats: GitStats;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ stats }) => {
  const cards = [
    {
      label: 'Total Commits',
      value: stats.summary.totalCommits,
      icon: GitCommit,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Contributors',
      value: stats.summary.totalAuthors,
      icon: Users,
      color: 'text-green-500',
      bg: 'bg-green-50',
    },
    {
      label: 'Files',
      value: stats.summary.totalFiles,
      icon: FileCode,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{card.value.toLocaleString()}</p>
            </div>
            <div className={`p-3 rounded-lg ${card.bg}`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
