import type { ReadinessDiagnostics as ReadinessDiagnosticsType } from '../api';

interface ReadinessDiagnosticsDisplayProps {
  data: ReadinessDiagnosticsType;
}

function PathTable({
  rows,
  emptyMessage,
}: {
  rows: { path: string; touches: number; rank: number }[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/80">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">#</th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Path
            </th>
            <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
              Touches
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {rows.map((r) => (
            <tr key={`${r.rank}-${r.path}`} className="hover:bg-gray-50/80 dark:hover:bg-white/5">
              <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.rank}</td>
              <td className="px-3 py-2 font-mono text-gray-900 dark:text-gray-100 break-all">
                {r.path}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-800 dark:text-gray-200">
                {r.touches}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReadinessDiagnosticsDisplay({ data }: ReadinessDiagnosticsDisplayProps) {
  return (
    <div className="space-y-10">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Summary</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Dominant contributor (share)</dt>
            <dd className="mt-1 font-medium text-gray-900 dark:text-white">
              {data.dominantContributorSharePercent}%
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Top contributor inactive (6 mo)</dt>
            <dd className="mt-1 font-medium text-gray-900 dark:text-white">
              {data.topContributorInactiveRecently ? 'Yes' : 'No'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Firefighting commits (1y)</dt>
            <dd className="mt-1 font-medium text-gray-900 dark:text-white">
              {data.firefightingCommits.length}
            </dd>
          </div>
        </dl>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Most-changed paths ({data.windows.churnSince})
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-3">
          Files touched most often in commit history (non-merge), similar to a churn hotspot list.
        </p>
        <PathTable rows={data.topChurnFiles} emptyMessage="No paths in this window." />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Bug-style commit touches
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-3">
          Paths touched in commits whose messages match{' '}
          <span className="font-mono text-gray-700 dark:text-gray-300">fix|bug|broken</span>{' '}
          (case-insensitive).
        </p>
        <PathTable rows={data.bugFixTouchFiles} emptyMessage="No matching commits." />
      </section>

      {data.highRiskOverlap.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            High churn + bug touches
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-3">
            Paths that appear in both top churn and top bug-touch lists.
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-800 dark:text-gray-200 space-y-1">
            {data.highRiskOverlap.map((p) => (
              <li key={p} className="font-mono break-all">
                {p}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Contributors (all time)
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-3">
            From <span className="font-mono">git shortlog -sn --no-merges</span>.
          </p>
          <PathTable
            rows={data.contributorsAllTime.map((c) => ({
              path: c.name,
              touches: c.commits,
              rank: c.rank,
            }))}
            emptyMessage="No contributors."
          />
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Contributors ({data.windows.recentContributorsSince})
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-3">
            Same shortlog, limited to recent commits.
          </p>
          <PathTable
            rows={data.contributorsRecent.map((c) => ({
              path: c.name,
              touches: c.commits,
              rank: c.rank,
            }))}
            emptyMessage="No commits in the recent window."
          />
        </section>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Firefighting (1y)</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-3">
          Commits in the last year whose subject matches{' '}
          <span className="font-mono">revert|hotfix|emergency|rollback</span>.
        </p>
        {data.firefightingCommits.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">None found.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.firefightingCommits.map((c) => (
              <li
                key={c.hash}
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2"
              >
                <div className="font-mono text-xs text-gray-500 dark:text-gray-400">{c.hash}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{c.date}</div>
                <div className="text-gray-900 dark:text-gray-100 mt-1">{c.subject}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Caveats</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-1">
          {data.caveats.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
