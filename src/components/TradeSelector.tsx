import React, { useState } from 'react';
import { Calendar, Users, ArrowRight } from 'lucide-react';
import { SleeperTrade, SleeperUser, SleeperRoster, PlayerInfo, DraftPick, DraftInfo, DraftPickDetail } from '../types/sleeper';
import { SleeperAPI } from '../services/sleeperApi';

interface TradeSelectorProps {
  trades: SleeperTrade[];
  users: SleeperUser[];
  rosters: SleeperRoster[];
  players: Record<string, PlayerInfo>;
  selectedTrades: string[];
  onSelectionChange: (tradeIds: string[]) => void;
  leagueId: string;
  league: SleeperLeague;
}

export const TradeSelector: React.FC<TradeSelectorProps> = ({
  trades,
  users,
  rosters,
  players,
  selectedTrades,
  onSelectionChange,
  leagueId,
  league
}) => {
  const [drafts, setDrafts] = useState<DraftInfo[]>([]);
  const [draftPicks, setDraftPicks] = useState<Record<string, DraftPickDetail[]>>({});
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [previousSeasonRosters, setPreviousSeasonRosters] = useState<Record<string, SleeperRoster[]>>({});
  const [previousSeasonUsers, setPreviousSeasonUsers] = useState<Record<string, SleeperUser[]>>({});

  React.useEffect(() => {
    loadDraftData();
  }, [leagueId]);

  const loadDraftData = async () => {
    if (draftsLoaded) return;
    
    try {
      const draftsData = await SleeperAPI.getLeagueDrafts(leagueId);
      setDrafts(draftsData);
      
      // Load picks for each draft
      const allPicks: Record<string, DraftPickDetail[]> = {};
      for (const draft of draftsData) {
        const picks = await SleeperAPI.getDraftPicks(draft.draft_id);
        allPicks[draft.draft_id] = picks;
      }
      setDraftPicks(allPicks);
      
      // Load previous season data for pick inference
      await loadPreviousSeasonData(draftsData);
      
      setDraftsLoaded(true);
    } catch (error) {
      console.error('Error loading draft data:', error);
    }
  };

  const loadPreviousSeasonData = async (draftsData: DraftInfo[]) => {
    const seasonsToLoad = new Set<string>();
    
    // Identify which seasons we need previous data for (to determine standings)
    trades.forEach(trade => {
      (trade.draft_picks || []).forEach(pick => {
        const previousSeason = (parseInt(pick.season) - 1).toString();
        seasonsToLoad.add(previousSeason);
      });
    });
    
    const previousRosters: Record<string, SleeperRoster[]> = {};
    const previousUsers: Record<string, SleeperUser[]> = {};
    
    // Load data for each previous season
    for (const season of seasonsToLoad) {
      try {
        // For standings, we need the season before the pick season
        // So for a 2024 pick, we need 2023 standings
        const previousLeagueId = await findPreviousSeasonLeagueId((parseInt(season) + 1).toString());
        if (previousLeagueId) {
          const [rostersData, usersData] = await Promise.all([
            SleeperAPI.getLeagueRosters(previousLeagueId),
            SleeperAPI.getLeagueUsers(previousLeagueId)
          ]);
          previousRosters[season] = rostersData;
          previousUsers[season] = usersData;
          console.log(`Loaded ${season} season data:`, { rosters: rostersData.length, users: usersData.length });
        }
      } catch (error) {
        console.warn(`Failed to load data for season ${season}:`, error);
      }
    }
    
    setPreviousSeasonRosters(previousRosters);
    setPreviousSeasonUsers(previousUsers);
  };
  
  const findPreviousSeasonLeagueId = async (season: string): Promise<string | null> => {
    // Try to find the league ID for the previous season
    try {
      // For the season we're looking for picks from, we need to find that season's league
      // If we're looking at a 2024 pick, we need the 2024 league data
      const targetYear = parseInt(season);
      const currentYear = parseInt(league.season);
      
      if (targetYear === currentYear) {
        // Same season, use current league
        return league.league_id;
      } else if (targetYear === currentYear - 1 && league.previous_league_id) {
        // Previous season, use previous_league_id
        return league.previous_league_id;
      }
      
      // For other seasons, we'd need to traverse the league history
      // This is a limitation of the current approach
      return null;
    } catch (error) {
      console.warn(`Error finding league ID for season ${season}:`, error);
      return null;
    }
  };

  const getUserById = (userId: string) => {
    return users.find(user => user.user_id === userId);
  };

  const getPlayerName = (playerId: string) => {
    const player = players[playerId];
    if (!player) return `Player ${playerId}`;
    return `${player.full_name} (${player.position})`;
  };

  const formatDraftPick = (pick: DraftPick) => {
    const pickSeason = pick.season;
    const previousSeason = (parseInt(pickSeason) - 1).toString();
    
    // Get rosters from the previous season to determine standings
    const previousRosters = previousSeasonRosters[previousSeason] || [];
    const previousUsers = previousSeasonUsers[previousSeason] || [];
    
    // Find the original owner's info from previous season
    let originalOwnerName = 'Unknown';
    let inferredPickNumber = '';
    
    if (previousRosters.length > 0) {
      // Find the original owner in the current season first
      const originalRoster = rosters.find(r => r.roster_id === pick.original_owner);
      if (originalRoster) {
        const originalUser = users.find(u => u.user_id === originalRoster.owner_id);
        if (originalUser) {
          // Find the same user in the previous season
          const previousUser = previousUsers.find(u => u.user_id === originalUser.user_id);
          if (previousUser) {
            const previousRoster = previousRosters.find(r => r.owner_id === previousUser.user_id);
            if (previousRoster) {
              originalOwnerName = originalUser.display_name || originalUser.username;
              
              // Calculate final rank from previous season
              const finalRank = calculateRankFromRecord(previousRoster, previousRosters);
              const totalTeams = previousRosters.length;
              const pickInRound = (totalTeams - finalRank) + 1;
              inferredPickNumber = `${pick.round}.${pickInRound.toString().padStart(2, '0')}`;
            }
          }
        }
      }
    }
    
    // Find the draft for this pick's season
    const draft = drafts.find(d => d.season === pickSeason);
    const roundSuffix = pick.round === 1 ? 'st' : pick.round === 2 ? 'nd' : pick.round === 3 ? 'rd' : 'th';
    
    if (draft && draftPicks[draft.draft_id]) {
      // Draft has occurred, try to find the actual player selected
      const allPicks = draftPicks[draft.draft_id];
      
      if (inferredPickNumber) {
        // Calculate the overall pick number
        const [roundStr, pickInRoundStr] = inferredPickNumber.split('.');
        const roundNum = parseInt(roundStr);
        const pickInRound = parseInt(pickInRoundStr);
        const totalTeams = previousRosters.length || rosters.length;
        const overallPickNumber = ((roundNum - 1) * totalTeams) + pickInRound;
        
        // Find the pick by overall pick number
        const draftPickDetail = allPicks.find(p => p.pick_no === overallPickNumber);
        
        if (draftPickDetail && draftPickDetail.player_id) {
          const playerName = getPlayerName(draftPickDetail.player_id);
          return `${pickSeason} ${pick.round}${roundSuffix} Round Pick (${inferredPickNumber} - ${playerName})`;
        }
      }
      
      // Draft occurred but couldn't find the specific pick, show with inferred number
      if (inferredPickNumber) {
        return `${pickSeason} ${pick.round}${roundSuffix} Round Pick (${inferredPickNumber})`;
      }
      
      // Draft occurred but no inferred number available
      return `${pickSeason} ${pick.round}${roundSuffix} Round Pick`;
    }
    
    // Draft hasn't occurred yet
    if (inferredPickNumber) {
      return `${pickSeason} ${pick.round}${roundSuffix} Round Pick (${inferredPickNumber})`;
    }
    
    // Fallback
    return `${pickSeason} ${pick.round}${roundSuffix} Round Pick`;
  };
  
  const calculateRankFromRecord = (roster: SleeperRoster, allRosters: SleeperRoster[]): number => {
    // Sort rosters by wins (desc), then by points for (desc)
    const sortedRosters = [...allRosters].sort((a, b) => {
      const aWins = a.settings.wins || 0;
      const bWins = b.settings.wins || 0;
      if (bWins !== aWins) return bWins - aWins;
      
      const aPoints = a.settings.fpts || 0;
      const bPoints = b.settings.fpts || 0;
      return bPoints - aPoints;
    });
    
    return sortedRosters.findIndex(r => r.roster_id === roster.roster_id) + 1;
  };

  const formatTradeDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleTradeToggle = (tradeId: string) => {
    const newSelected = selectedTrades.includes(tradeId)
      ? selectedTrades.filter(id => id !== tradeId)
      : [...selectedTrades, tradeId];
    onSelectionChange(newSelected);
  };

  const getUserByRosterId = (rosterId: number) => {
    // Find the roster first, then get the user
    const roster = rosters.find(r => r.roster_id === rosterId);
    if (!roster) return null;
    return users.find(user => user.user_id === roster.owner_id);
  };

  const getTradeDetails = (trade: SleeperTrade) => {
    const tradeDetails: Array<{
      user: SleeperUser;
      received: string[];
      sent: string[];
      receivedPicks: string[];
      sentPicks: string[];
    }> = [];
    
    // Process each roster involved in the trade
    trade.roster_ids.forEach(rosterId => {
      const user = getUserByRosterId(rosterId);
      if (!user) return;
      
      const received: string[] = [];
      const sent: string[] = [];
      
      // Find players this roster received (in adds)
      Object.entries(trade.adds || {}).forEach(([playerId, toRosterId]) => {
        if (toRosterId === rosterId) {
          received.push(getPlayerName(playerId));
        }
      });
      
      // Find players this roster sent (in drops)
      Object.entries(trade.drops || {}).forEach(([playerId, fromRosterId]) => {
        if (fromRosterId === rosterId) {
          sent.push(getPlayerName(playerId));
        }
      });
      
      tradeDetails.push({
        user,
        received,
        sent,
        receivedPicks: [],
        sentPicks: []
      });
    });

    // Process draft picks
    (trade.draft_picks || []).forEach(pick => {
      // Find who received the pick
      const receiver = tradeDetails.find(d => getUserByRosterId(pick.owner_id)?.user_id === d.user.user_id);
      if (receiver) {
        receiver.receivedPicks.push(formatDraftPick(pick));
      }
      
      // Find who sent the pick
      const sender = tradeDetails.find(d => getUserByRosterId(pick.previous_owner_id)?.user_id === d.user.user_id);
      if (sender) {
        sender.sentPicks.push(formatDraftPick(pick));
      }
    });

    return tradeDetails;
  };

  return (
    <div className="space-y-3">
      {trades.map((trade) => {
        const isSelected = selectedTrades.includes(trade.transaction_id);
        const tradeDetails = getTradeDetails(trade);
        
        return (
          <div
            key={trade.transaction_id}
            className={`border rounded-lg transition-all ${
              isSelected ? 'border-sleeper-primary bg-sleeper-primary/5' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleTradeToggle(trade.transaction_id)}
                    className="w-4 h-4 text-sleeper-primary border-gray-300 rounded focus:ring-sleeper-primary"
                  />
                  <div>
                    <div className="flex items-center space-x-2 text-sm font-medium text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>Week {trade.week}</span>
                      <span className="text-gray-400">•</span>
                      <span>{formatTradeDate(trade.status_updated)}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {tradeDetails.map(detail => detail.user.display_name || detail.user.username).join(' ↔ ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Always show trade details */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Trade Details</h4>
                <div className="space-y-3">
                  {tradeDetails.map((details, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="font-medium text-gray-900 mb-2">
                        {details.user.display_name || details.user.username}
                      </div>
                      <div className="space-y-2 text-sm">
                        {(details.received.length > 0 || details.receivedPicks.length > 0) && (
                          <div>
                            <span className="text-green-600 font-medium">Receives:</span>
                            <div className="ml-2 mt-1">
                              {details.received.map((player, idx) => (
                                <div key={idx} className="text-gray-700">• {player}</div>
                              ))}
                              {details.receivedPicks.map((pick, idx) => (
                                <div key={`pick-${idx}`} className="text-gray-700">• {pick}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(details.sent.length > 0 || details.sentPicks.length > 0) && (
                          <div>
                            <span className="text-red-600 font-medium">Sends:</span>
                            <div className="ml-2 mt-1">
                              {details.sent.map((player, idx) => (
                                <div key={idx} className="text-gray-700">• {player}</div>
                              ))}
                              {details.sentPicks.map((pick, idx) => (
                                <div key={`pick-${idx}`} className="text-gray-700">• {pick}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};