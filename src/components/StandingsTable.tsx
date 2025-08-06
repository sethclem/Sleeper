import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { SleeperRoster, SleeperUser } from '../types/sleeper';

interface StandingsTableProps {
  rosters: SleeperRoster[];
  users: SleeperUser[];
}

type SortField = 'wins' | 'fpts' | 'fpts_against';
type SortDirection = 'asc' | 'desc';

export const StandingsTable: React.FC<StandingsTableProps> = ({ rosters, users }) => {
  const [sortField, setSortField] = useState<SortField>('wins');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const getUserForRoster = (roster: SleeperRoster) => {
    return users.find(user => user.user_id === roster.owner_id);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedRosters = [...rosters].sort((a, b) => {
    let aValue = a.settings[sortField] || 0;
    let bValue = b.settings[sortField] || 0;

    if (sortDirection === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'desc' ? 
      <ChevronDown className="w-4 h-4" /> : 
      <ChevronUp className="w-4 h-4" />;
  };

  return (
    <div className="card">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">League Standings</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('wins')}
              >
                <div className="flex items-center space-x-1">
                  <span>Record</span>
                  <SortIcon field="wins" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('fpts')}
              >
                <div className="flex items-center space-x-1">
                  <span>Points For</span>
                  <SortIcon field="fpts" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('fpts_against')}
              >
                <div className="flex items-center space-x-1">
                  <span>Points Against</span>
                  <SortIcon field="fpts_against" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRosters.map((roster, index) => {
              const user = getUserForRoster(roster);
              const wins = roster.settings.wins || 0;
              const losses = roster.settings.losses || 0;
              const ties = roster.settings.ties || 0;
              const pointsFor = Math.round((roster.settings.fpts || 0) * 100) / 100;
              const pointsAgainst = Math.round((roster.settings.fpts_against || 0) * 100) / 100;

              return (
                <tr key={roster.roster_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">
                        #{index + 1}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-sleeper-primary rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                        {user?.display_name?.[0] || user?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user?.display_name || user?.username || 'Unknown'}
                        </div>
                        {user?.username && user.display_name && (
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {wins}-{losses}{ties > 0 && `-${ties}`}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{pointsFor}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{pointsAgainst}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};