import React, { useState } from 'react';
import { Search, Users, Calendar, Trophy } from 'lucide-react';
import { SleeperAPI } from '../services/sleeperApi';
import { SleeperUser, SleeperLeague } from '../types/sleeper';

interface LeagueSelectorProps {
  onLeagueSelect: (leagueId: string) => void;
}

export const LeagueSelector: React.FC<LeagueSelectorProps> = ({ onLeagueSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [leagues, setLeagues] = useState<SleeperLeague[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // First get user by username
      const user = await SleeperAPI.getUserByUsername(searchTerm.trim());
      if (!user) {
        throw new Error('User not found');
      }
      
      // Then get their leagues
      const userLeagues = await SleeperAPI.getUserLeagues(user.user_id, '2024');
      setLeagues(userLeagues);
    } catch (err) {
      console.error('Error fetching leagues:', err);
      setError('Failed to fetch leagues: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sleeper League Analyzer</h1>
        <p className="text-gray-600">Enter a Sleeper username to view their leagues</p>
      </div>

      <div className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Enter Sleeper username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sleeper-primary focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !searchTerm.trim()}
            className="px-6 py-3 bg-sleeper-primary text-white rounded-lg hover:bg-sleeper-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {leagues.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Select a League</h2>
          <div className="grid gap-4">
            {leagues.map((league) => (
              <div
                key={league.league_id}
                onClick={() => onLeagueSelect(league.league_id)}
                className="p-4 border border-gray-200 rounded-lg hover:border-sleeper-primary hover:bg-sleeper-primary/5 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{league.name}</h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{league.total_rosters} teams</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Season {league.season}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Trophy className="w-4 h-4" />
                        <span>{league.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};