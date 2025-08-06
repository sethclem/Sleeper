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
    
    // Identify which seasons we need previous data for
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
        // Find the league ID for the previous season
        const previousLeagueId = await findPreviousSeasonLeagueId(season);
        if (previousLeagueId) {
          const [rostersData, usersData] = await Promise.all([
            SleeperAPI.getLeagueRosters(previousLeagueId),
            SleeperAPI.getLeagueUsers(previousLeagueId)
          ]);
          previousRosters[season] = rostersData;
          previousUsers[season] = usersData;
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
    // This is a simplified approach - in reality, you might need to traverse the league history
    if (league.previous_league_id && league.season === (parseInt(season) + 1).toString()) {
      return league.previous_league_id;
    }
    return null;
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
    const previousSeason = (parseInt(pick.season) - 1).toString();
    const previousRosters = previousSeasonRosters[previousSeason] || [];
    const previousUsers = previousSeasonUsers[previousSeason] || [];
    
    // Find the original owner's info from previous season
    let originalOwnerName = 'Unknown';
    let inferredPickNumber = '';
    
    if (previousRosters.length > 0) {
      // Find the roster by matching user across seasons
      const currentRoster = rosters.find(r => r.roster_id === pick.original_owner);
      if (currentRoster) {
        const currentUser = users.find(u => u.user_id === currentRoster.owner_id);
        if (currentUser) {
          // Find the same user in previous season
          const previousUser = previousUsers.find(u => u.user_id === currentUser.user_id);
          if (previousUser) {
            const previousRoster = previousRosters.find(r => r.owner_id === previousUser.user_id);
            if (previousRoster) {
              originalOwnerName = previousUser.display_name || previousUser.username;
              
              // Calculate inferred pick number based on standings
              const finalRank = previousRoster.settings.wins !== undefined ? 
                calculateRankFromRecord(previousRoster, previousRosters) : 
                (previousRoster.settings as any).rank || previousRosters.length;
              
              const totalTeams = previousRosters.length;
              const pickInRound = (totalTeams - finalRank) + 1;
              inferredPickNumber = `${pick.round}.${pickInRound.toString().padStart(2, '0')}`;
            }
          }
        }
      }
    }
    
    const draft = drafts.find(d => d.season === pick.season);
    
    if (draft && draftPicks[draft.draft_id]) {
      // Find the actual draft pick by matching the inferred pick number
      const roundPicks = draftPicks[draft.draft_id].filter(p => p.round === pick.round);
      let draftPickDetail = null;
      
      if (inferredPickNumber) {
        const [, pickNumStr] = inferredPickNumber.split('.');
        const pickNum = parseInt(pickNumStr);
        draftPickDetail = roundPicks[pickNum - 1]; // Array is 0-indexed
      }
      
      if (draftPickDetail && draftPickDetail.player_id) {
        // Draft completed, show the player selected with that pick
        const playerName = getPlayerName(draftPickDetail.player_id);
        const roundSuffix = pick.round === 1 ? 'st' : pick.round === 2 ? 'nd' : pick.round === 3 ? 'rd' : 'th';
        return `${pick.season} ${pick.round}${roundSuffix} Round Pick (${inferredPickNumber} - ${playerName})`;
      }
    }
    
    // Draft not completed or pick not found, show just the pick
    const roundSuffix = pick.round === 1 ? 'st' : pick.round === 2 ? 'nd' : pick.round === 3 ? 'rd' : 'th';
    if (inferredPickNumber && originalOwnerName !== 'Unknown') {
      return `${pick.season} ${pick.round}${roundSuffix} Round Pick (${inferredPickNumber} - from ${originalOwnerName})`;
    }
    return `${pick.season} ${pick.round}${roundSuffix} Round Pick`;
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