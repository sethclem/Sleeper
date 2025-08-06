import React from 'react';
import { Zap } from 'lucide-react';
import { SleeperMatchup, SleeperRoster, SleeperUser } from '../types/sleeper';

interface MatchupGridProps {
  matchups: SleeperMatchup[];
  rosters: SleeperRoster[];
  users: SleeperUser[];
  currentWeek: number;
}

export const MatchupGrid: React.FC<MatchupGridProps> = ({ matchups, rosters, users, currentWeek }) => {
  const getUserForRoster = (rosterId: number) => {
    const roster = rosters.find(r => r.roster_id === rosterId);
    if (!roster) return null;
    return users.find(user => user.user_id === roster.owner_id);
  };

  // Group matchups by matchup_id
  const groupedMatchups = matchups.reduce((acc, matchup) => {
    if (!acc[matchup.matchup_id]) {
      acc[matchup.matchup_id] = [];
    }
    acc[matchup.matchup_id].push(matchup);
    return acc;
  }, {} as Record<number, SleeperMatchup[]>);

  const matchupPairs = Object.values(groupedMatchups).filter(group => group.length === 2);

  if (matchupPairs.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Matchups Available</h3>
        <p className="text-gray-600">Matchup data for week {currentWeek} is not yet available.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-sleeper-primary" />
          Week {currentWeek} Matchups
        </h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matchupPairs.map((pair, index) => {
            const [team1, team2] = pair;
            const user1 = getUserForRoster(team1.roster_id);
            const user2 = getUserForRoster(team2.roster_id);
            
            const team1Points = Math.round(team1.points * 100) / 100;
            const team2Points = Math.round(team2.points * 100) / 100;
            
            const isTeam1Winning = team1Points > team2Points;
            const isTeam2Winning = team2Points > team1Points;

            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  {/* Team 1 */}
                  <div className={`flex items-center flex-1 ${isTeam1Winning ? 'text-green-600' : 'text-gray-600'}`}>
                    <div className="w-10 h-10 bg-sleeper-primary rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                      {user1?.display_name?.[0] || user1?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {user1?.display_name || user1?.username || 'Unknown'}
                      </div>
                      <div className={`text-lg font-bold ${isTeam1Winning ? 'text-green-600' : 'text-gray-900'}`}>
                        {team1Points}
                      </div>
                    </div>
                  </div>

                  {/* VS */}
                  <div className="px-4">
                    <span className="text-gray-400 font-medium">VS</span>
                  </div>

                  {/* Team 2 */}
                  <div className={`flex items-center flex-1 justify-end ${isTeam2Winning ? 'text-green-600' : 'text-gray-600'}`}>
                    <div className="flex-1 text-right">
                      <div className="font-medium">
                        {user2?.display_name || user2?.username || 'Unknown'}
                      </div>
                      <div className={`text-lg font-bold ${isTeam2Winning ? 'text-green-600' : 'text-gray-900'}`}>
                        {team2Points}
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-sleeper-secondary rounded-full flex items-center justify-center text-white font-bold text-sm ml-3">
                      {user2?.display_name?.[0] || user2?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  </div>
                </div>

                {/* Point Difference */}
                <div className="mt-3 text-center">
                  <span className="text-sm text-gray-500">
                    {team1Points === team2Points ? 'Tied' : 
                     `${Math.abs(team1Points - team2Points).toFixed(1)} point difference`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};