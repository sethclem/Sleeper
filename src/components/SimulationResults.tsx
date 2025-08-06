import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Trophy, BarChart3, Table } from 'lucide-react';
import { TradeSimulationResult } from '../types/sleeper';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface SimulationResultsProps {
  result: TradeSimulationResult;
  selectedTradeCount: number;
}

export const SimulationResults: React.FC<SimulationResultsProps> = ({ result, selectedTradeCount }) => {
  const [activeView, setActiveView] = useState<'standings' | 'weekly'>('standings');

  const getStandingChange = (originalRank: number, simulatedRank: number) => {
    const change = originalRank - simulatedRank;
    if (change > 0) return { direction: 'up', value: change };
    if (change < 0) return { direction: 'down', value: Math.abs(change) };
    return { direction: 'same', value: 0 };
  };

  const formatWeeklyData = () => {
    return result.weeklyImpact.map(week => {
      const weekData: any = { week: `Week ${week.week}` };
      
      week.teamImpacts.forEach(team => {
        weekData[`${team.teamName}_original`] = team.originalPoints;
        weekData[`${team.teamName}_simulated`] = team.simulatedPoints;
      });
      
      return weekData;
    });
  };

  const getAffectedTeamsData = () => {
    return result.originalStandings
      .filter(team => result.affectedTeams.includes(team.rosterId.toString()))
      .map(originalTeam => {
        const simulatedTeam = result.simulatedStandings.find(s => s.rosterId === originalTeam.rosterId);
        return {
          name: originalTeam.teamName,
          originalWins: originalTeam.wins,
          simulatedWins: simulatedTeam?.wins || 0,
          originalPoints: Math.round(originalTeam.pointsFor),
          simulatedPoints: Math.round(simulatedTeam?.pointsFor || 0)
        };
      });
  };

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="card p-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Simulation Results</h3>
          <p className="text-gray-600">
            Impact of undoing {selectedTradeCount} trade{selectedTradeCount !== 1 ? 's' : ''} on league standings and performance
          </p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveView('standings')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
              activeView === 'standings'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Table className="w-4 h-4 mr-2" />
            Standings Comparison
          </button>
          <button
            onClick={() => setActiveView('weekly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
              activeView === 'weekly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Weekly Impact
          </button>
        </div>
      </div>

      {activeView === 'standings' ? (
        /* Standings Comparison */
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900">League Standings Comparison</h4>
            <p className="text-sm text-gray-600 mt-1">
              How the final standings would change without the selected trades
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Original Rank</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Simulated Rank</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Change</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Original Record</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Simulated Record</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Points Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {result.originalStandings.map((originalTeam) => {
                  const simulatedTeam = result.simulatedStandings.find(s => s.rosterId === originalTeam.rosterId);
                  const change = getStandingChange(originalTeam.rank, simulatedTeam?.rank || originalTeam.rank);
                  const isAffected = result.affectedTeams.includes(originalTeam.rosterId.toString());
                  const pointsDiff = (simulatedTeam?.pointsFor || 0) - originalTeam.pointsFor;
                  
                  return (
                    <tr key={originalTeam.rosterId} className={isAffected ? 'bg-yellow-50' : ''}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">{originalTeam.teamName}</span>
                          {isAffected && (
                            <span className="ml-2 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                              Affected
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">#{originalTeam.rank}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">#{simulatedTeam?.rank || originalTeam.rank}</td>
                      <td className="px-6 py-4 text-center">
                        {change.direction === 'up' && (
                          <div className="flex items-center justify-center text-green-600">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">+{change.value}</span>
                          </div>
                        )}
                        {change.direction === 'down' && (
                          <div className="flex items-center justify-center text-red-600">
                            <TrendingDown className="w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">-{change.value}</span>
                          </div>
                        )}
                        {change.direction === 'same' && (
                          <span className="text-sm text-gray-500">No change</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        {originalTeam.wins}-{originalTeam.losses}
                        {originalTeam.ties > 0 && `-${originalTeam.ties}`}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        {simulatedTeam?.wins || originalTeam.wins}-{simulatedTeam?.losses || originalTeam.losses}
                        {(simulatedTeam?.ties || originalTeam.ties) > 0 && `-${simulatedTeam?.ties || originalTeam.ties}`}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-medium ${
                          pointsDiff > 0 ? 'text-green-600' : pointsDiff < 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {pointsDiff > 0 ? '+' : ''}{Math.round(pointsDiff * 100) / 100}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Weekly Impact Charts */
        <div className="space-y-6">
          {/* Affected Teams Performance Chart */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900">Affected Teams Performance</h4>
              <p className="text-sm text-gray-600 mt-1">
                Comparison of wins and total points for teams involved in the selected trades
              </p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getAffectedTeamsData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="originalWins" fill="#94a3b8" name="Original Wins" />
                  <Bar dataKey="simulatedWins" fill="#00ceb8" name="Simulated Wins" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Points Impact */}
          {result.weeklyImpact.length > 0 && (
            <div className="card">
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">Weekly Points Impact</h4>
                <p className="text-sm text-gray-600 mt-1">
                  How weekly scores would have changed for affected teams
                </p>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={formatWeeklyData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {result.affectedTeams.slice(0, 4).map((teamId, index) => {
                      const team = result.originalStandings.find(s => s.rosterId.toString() === teamId);
                      const colors = ['#00ceb8', '#ff6b35', '#8b5cf6', '#10b981'];
                      return (
                        <Line
                          key={teamId}
                          type="monotone"
                          dataKey={`${team?.teamName}_simulated`}
                          stroke={colors[index]}
                          strokeWidth={2}
                          name={`${team?.teamName} (Simulated)`}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};