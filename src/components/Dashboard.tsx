import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, TrendingUp, Users, Activity, ChevronDown } from 'lucide-react';
import { ConsolidatedLeague, SleeperLeague, SleeperRoster, SleeperUser, SleeperMatchup, SleeperTransaction, LeagueStats } from '../types/sleeper';
import { SleeperAPI } from '../services/sleeperApi';
import { StandingsTable } from './StandingsTable';
import { MatchupGrid } from './MatchupGrid';
import { RecentActivity } from './RecentActivity';
import { TradeSimulator } from './TradeSimulator';

interface DashboardProps {
  league: ConsolidatedLeague;
  onBack: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ league, onBack }) => {
  const [selectedSeason, setSelectedSeason] = useState<SleeperLeague>(league.mostRecentSeason);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const [rosters, setRosters] = useState<SleeperRoster[]>([]);
  const [users, setUsers] = useState<SleeperUser[]>([]);
  const [matchups, setMatchups] = useState<SleeperMatchup[]>([]);
  const [transactions, setTransactions] = useState<SleeperTransaction[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LeagueStats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trades'>('overview');

  useEffect(() => {
    loadLeagueData();
  }, [selectedSeason.league_id]);

  const loadLeagueData = async () => {
    setLoading(true);
    try {
      const [rostersData, usersData, nflState] = await Promise.all([
        SleeperAPI.getLeagueRosters(selectedSeason.league_id),
        SleeperAPI.getLeagueUsers(selectedSeason.league_id),
        SleeperAPI.getNFLState()
      ]);

      setRosters(rostersData);
      setUsers(usersData);
      setCurrentWeek(nflState.week);

      // Load current week matchups and recent transactions
      const [matchupsData, transactionsData] = await Promise.all([
        SleeperAPI.getMatchups(selectedSeason.league_id, nflState.week),
        SleeperAPI.getTransactions(selectedSeason.league_id, nflState.week)
      ]);

      setMatchups(matchupsData);
      setTransactions(transactionsData);

      // Calculate league stats
      calculateStats(rostersData, usersData, transactionsData);
    } catch (error) {
      console.error('Error loading league data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (rostersData: SleeperRoster[], usersData: SleeperUser[], transactionsData: SleeperTransaction[]) => {
    if (rostersData.length === 0) return;

    const totalPoints = rostersData.reduce((sum, roster) => sum + (roster.settings.fpts || 0), 0);
    const averageScore = totalPoints / rostersData.length;
    
    const topRoster = rostersData.reduce((max, roster) => 
      (roster.settings.fpts || 0) > (max.settings.fpts || 0) ? roster : max
    );
    
    const topUser = usersData.find(user => user.user_id === topRoster.owner_id);

    setStats({
      totalTeams: rostersData.length,
      totalTransactions: transactionsData.length,
      averageScore: Math.round(averageScore * 100) / 100,
      highestScore: Math.round((topRoster.settings.fpts || 0) * 100) / 100,
      topScorer: topUser?.display_name || topUser?.username || 'Unknown'
    });
  };

  const handleSeasonChange = (season: SleeperLeague) => {
    setSelectedSeason(season);
    setSeasonDropdownOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sleeper-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading league data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{league.name}</h1>
                <p className="text-sm text-gray-500">Week {currentWeek} • {selectedSeason.season} Season</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Season Selector */}
              <div className="relative">
                <button
                  onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">{selectedSeason.season} Season</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                
                {seasonDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="py-1">
                      {league.seasons.map((season) => (
                        <button
                          key={season.league_id}
                          onClick={() => handleSeasonChange(season)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                            selectedSeason.league_id === season.league_id ? 'bg-sleeper-primary/10 text-sleeper-primary' : 'text-gray-700'
                          }`}
                        >
                          {season.season} Season
                          <span className="text-xs text-gray-500 block">{season.status}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <span className="px-3 py-1 bg-sleeper-primary/10 text-sleeper-primary rounded-full text-sm font-medium">
                {selectedSeason.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-sleeper-primary text-sleeper-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('trades')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'trades'
                  ? 'border-sleeper-primary text-sleeper-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Trade Simulator
            </button>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' ? (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Teams</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalTeams}</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Score</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.averageScore}</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Trophy className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Top Scorer</p>
                      <p className="text-lg font-bold text-gray-900">{stats.topScorer}</p>
                      <p className="text-sm text-gray-500">{stats.highestScore} pts</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Activity className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Transactions</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Standings */}
              <div className="lg:col-span-2">
                <StandingsTable rosters={rosters} users={users} />
              </div>

              {/* Recent Activity */}
              <div>
                <RecentActivity transactions={transactions} users={users} />
              </div>
            </div>

            {/* Matchups */}
            <div className="mt-8">
              <MatchupGrid matchups={matchups} rosters={rosters} users={users} currentWeek={currentWeek} />
            </div>
          </>
        ) : (
          <TradeSimulator league={selectedSeason} rosters={rosters} users={users} />
        )}
      </div>
    </div>
  );
};