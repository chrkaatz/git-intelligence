import React from 'react';
import type { AuthorStats } from '../api';

interface AuthorListProps {
  authors: AuthorStats[];
}

export const AuthorList: React.FC<AuthorListProps> = ({ authors }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Top Contributors</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-3 font-medium">Author</th>
              <th className="px-6 py-3 font-medium">Commits</th>
              <th className="px-6 py-3 font-medium">Percentage</th>
              <th className="px-6 py-3 font-medium">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {authors.slice(0, 10).map((author, index) => (
              <tr key={`${author.email}-${index}`} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">{author.name}</div>
                    <div className="text-gray-500 text-xs">{author.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-900">{author.commits.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${author.percentage}%` }}
                      />
                    </div>
                    <span className="text-gray-500 text-xs">{author.percentage}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(author.lastCommit).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
