import React, { useState } from 'react';
import { Search, Users, Calendar, ArrowRight } from 'lucide-react';
import { SleeperAPI } from '../services/sleeperApi';
import { ConsolidatedLeague } from '../types/sleeper';

interface LeagueSelectorProps {
  onLeagueSelect: (league: ConsolidatedLeague) => void;
}

export const LeagueSelector: React.FC<LeagueSelectorProps> = ({ onLeagueSelect }) => {
  const [username, setUsername] = useState('');
  const [leagues, setLeagues] = useState<ConsolidatedLeague[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!username.trim()) return;

    setLoading(true);
    setError(null);
    setLeagues([]);

    try {
      const currentYear = new Date().getFullYear().toString();
      const userLeagues = await SleeperAPI.getUserLeagues(username, currentYear);
      
      if (userLeagues.length === 0) {
        setError('No NFL leagues found for this user.');
        return;
      }

      // Convert to consolidated leagues
      const consolidatedLeagues: ConsolidatedLeague[] = [];
      
      for (const league of userLeagues) {
        try {
          const consolidated = await SleeperAPI.buildConsolidatedLeague(league.league_id);
          consolidatedLeagues.push(consolidated);
        } catch (err) {
          console.warn(`Failed to consolidate league ${league.league_id}:`, err);
        }
      }

      setLeagues(consolidatedLeagues);
    } catch (err) {
      setError('Failed to fetch user data. Please check the username and try again.');
      console.error('Error fetching leagues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sleeper League Analyzer
          </h1>
          <p className="text-gray-600">
            Enter your Sleeper username to analyze your fantasy football leagues
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Enter Sleeper username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sleeper-primary focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !username.trim()}
              className="px-6 py-3 bg-sleeper-primary text-white rounded-lg hover:bg-sleeper-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        {leagues.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Select a League to Analyze
            </h2>
            <div className="grid gap-4">
              {leagues.map((league) => (
                <div
                  key={league.mostRecentSeason.league_id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onLeagueSelect(league)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {league.mostRecentSeason.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{league.mostRecentSeason.total_rosters} teams</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {league.seasons.length > 1 
                              ? `${league.seasons.length} seasons (${Math.min(...league.seasons.map(s => parseInt(s.season)))}-${Math.max(...league.seasons.map(s => parseInt(s.season)))})`
                              : `${league.mostRecentSeason.season} season`
                            }
                          </span>
                        </div>
                      </div>
                      {league.mostRecentSeason.settings.playoff_week_start && (
                        <div className="mt-2 text-sm text-gray-500">
                          Playoffs start Week {league.mostRecentSeason.settings.playoff_week_start}
                        </div>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};