import React, { useState } from 'react';
import { Search, Users, Trophy, Calendar } from 'lucide-react';
import { SleeperAPI } from '../services/sleeperApi';
import { SleeperUser, SleeperLeague, ConsolidatedLeague } from '../types/sleeper';

interface LeagueSelectorProps {
  onLeagueSelect: (consolidatedLeague: ConsolidatedLeague) => void;
}

export const LeagueSelector: React.FC<LeagueSelectorProps> = ({ onLeagueSelect }) => {
  const [username, setUsername] = useState('');
  const [user, setUser] = useState<SleeperUser | null>(null);
  const [consolidatedLeagues, setConsolidatedLeagues] = useState<ConsolidatedLeague[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!username.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const userData = await SleeperAPI.getUser(username.trim());
      if (!userData) {
        setError('User not found. Please check the username.');
        setUser(null);
        setConsolidatedLeagues([]);
        return;
      }
      
      setUser(userData);
      const userLeagues = await SleeperAPI.getUserLeagues(userData.user_id);
      const nflLeagues = userLeagues.filter(league => league.sport === 'nfl');
      const consolidated = SleeperAPI.consolidateLeagues(nflLeagues);
      setConsolidatedLeagues(consolidated);
    } catch (err) {
      setError('Failed to fetch user data. Please try again.');
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
    <div className="min-h-screen bg-gradient-to-br from-sleeper-dark via-gray-900 to-sleeper-gray flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="w-12 h-12 text-sleeper-primary mr-3" />
            <h1 className="text-4xl font-bold text-white">Sleeper Dashboard</h1>
          </div>
          <p className="text-gray-300 text-lg">Connect to your fantasy football league</p>
        </div>

        <div className="card p-8">
          <div className="mb-6">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Sleeper Username
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your Sleeper username"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sleeper-primary focus:border-transparent outline-none transition-all"
                  disabled={loading}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading || !username.trim()}
                className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {user && (
            <div className="mb-6 p-4 bg-sleeper-primary/10 border border-sleeper-primary/20 rounded-lg">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-sleeper-primary rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                  {user.display_name?.[0] || user.username[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {user.display_name || user.username}
                  </h3>
                  <p className="text-gray-600">@{user.username}</p>
                </div>
              </div>
            </div>
          )}

          {consolidatedLeagues.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Select a League ({consolidatedLeagues.length} found)
              </h3>
              <div className="space-y-3">
                {consolidatedLeagues.map((consolidatedLeague) => (
                  <button
                    key={consolidatedLeague.name}
                    onClick={() => onLeagueSelect(consolidatedLeague)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-sleeper-primary hover:bg-sleeper-primary/5 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-sleeper-primary transition-colors">
                          {consolidatedLeague.name}
                        </h4>
                        <div className="flex items-center text-sm text-gray-600 mt-1 space-x-4">
                          <span className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {consolidatedLeague.mostRecentSeason.total_rosters} teams
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {consolidatedLeague.totalSeasons} season{consolidatedLeague.totalSeasons !== 1 ? 's' : ''}
                          </span>
                          <span className="capitalize px-2 py-1 bg-gray-100 rounded text-xs">
                            {consolidatedLeague.mostRecentSeason.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-sleeper-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        →
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {user && consolidatedLeagues.length === 0 && !loading && (
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No NFL leagues found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};