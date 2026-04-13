import { useState } from 'react';
import type { CrossRepoReadinessDiagnostics as CrossRepoReadinessDiagnosticsType } from '../api';
import { ReadinessDiagnosticsDisplay } from './ReadinessDiagnosticsDisplay';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface CrossRepoReadinessDiagnosticsProps {
  data: CrossRepoReadinessDiagnosticsType;
}

function CommitsByMonthChart({
  rows,
  title,
}: {
  rows: { month: string; count: number }[];
  title: string;
}) {
  const chartData = rows.map((m) => ({ month: m.month, commits: m.count }));
  if (chartData.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No commit data.</p>;
  }
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      <div className="mt-4 h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 32 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="month"
              angle={-35}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-gray-600 dark:text-gray-400"
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'currentColor' }} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: '1px solid rgb(229 231 235)',
              }}
            />
            <Bar dataKey="commits" fill="#6366f1" radius={[4, 4, 0, 0]} name="Commits" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function CrossRepoReadinessDiagnostics({ data }: CrossRepoReadinessDiagnosticsProps) {
  const [tab, setTab] = useState<'project' | number>('project');

  if (data.totalRepos === 0) {
    return (
      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
        No repositories in this project.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
        <button
          type="button"
          onClick={() => setTab('project')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === 'project'
              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
          }`}
        >
          Project aggregate
        </button>
        {data.repositories.map((r, index) => (
          <button
            key={r.repoPath}
            type="button"
            onClick={() => setTab(index)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === index
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
            }`}
          >
            {r.repoName}
          </button>
        ))}
      </div>

      {tab === 'project' ? (
        <div className="space-y-10">
          <CommitsByMonthChart
            rows={data.aggregatedCommitsByMonth}
            title="Commits by month (all repos combined)"
          />
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Contributors (combined shortlog)
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
              Summed <span className="font-mono">git shortlog</span> counts across repositories
              (name must match exactly between repos).
            </p>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/80">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                      #
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                      Name
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                      Commits
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.aggregatedContributors.map((c) => (
                    <tr key={c.rank} className="hover:bg-gray-50/80 dark:hover:bg-white/5">
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{c.rank}</td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{c.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.commits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        (() => {
          const entry = data.repositories[tab as number];
          if (!entry) return null;
          return (
            <div className="space-y-10">
              <CommitsByMonthChart
                rows={entry.diagnostics.commitsByMonth}
                title={`Commits by month — ${entry.repoName}`}
              />
              <ReadinessDiagnosticsDisplay data={entry.diagnostics} />
            </div>
          );
        })()
      )}
    </div>
  );
}
