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
  league: ConsolidatedLeague;
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
  const [crossSeasonData, setCrossSeasonData] = useState<Record<string, {
    rosters: SleeperRoster[];
    users: SleeperUser[];
    drafts: DraftInfo[];
    draftPicks: Record<string, DraftPickDetail[]>;
  }>>({});

  React.useEffect(() => {
    loadDraftData();
  }, [leagueId]);

  const loadDraftData = async () => {
    if (draftsLoaded) return;
    
    try {
      // Load data for all seasons involved in trades
      await loadCrossSeasonData();
      
      setDraftsLoaded(true);
    } catch (error) {
      console.error('Error loading draft data:', error);
    }
  };

  const loadCrossSeasonData = async () => {
    const seasonsNeeded = new Set<string>();
    
    // Identify all seasons involved in trades
    trades.forEach(trade => {
      (trade.draft_picks || []).forEach(pick => {
        seasonsNeeded.add(pick.season);
        // Also need previous season for standings
        const previousSeason = (parseInt(pick.season) - 1).toString();
        seasonsNeeded.add(previousSeason);
      });
    });
    
    console.log('Seasons needed for cross-season analysis:', Array.from(seasonsNeeded));
    
    const crossSeasonDataMap: Record<string, {
      rosters: SleeperRoster[];
      users: SleeperUser[];
      drafts: DraftInfo[];
      draftPicks: Record<string, DraftPickDetail[]>;
    }> = {};
    
    // Load data for each season
    for (const season of seasonsNeeded) {
      try {
        const leagueIdForSeason = findLeagueIdForSeason(season);
        console.log(`Loading data for season ${season}, league ID:`, leagueIdForSeason);
        
        if (leagueIdForSeason) {
          const [rostersData, usersData, draftsData] = await Promise.all([
            SleeperAPI.getLeagueRosters(leagueIdForSeason),
            SleeperAPI.getLeagueUsers(leagueIdForSeason),
          const selectedPick = draftPicks.find(p => p.pick_no === overallPickNumber);
          console.log(`Found pick:`, selectedPick);
          
          if (selectedPick && selectedPick.player_id) {
            const selectedPlayer = getPlayerName(selectedPick.player_id);
          // Load draft picks for this season
          const seasonDraftPicks: Record<string, DraftPickDetail[]> = {};
          for (const draft of draftsData) {
            const picks = await SleeperAPI.getDraftPicks(draft.draft_id);
            console.log(`No player found for pick ${overallPickNumber}, selectedPick:`, selectedPick);
            console.log(`Available pick numbers:`, draftPicks.map(p => p.pick_no).sort((a, b) => a - b));
          }
          
          crossSeasonDataMap[season] = {
            rosters: rostersData,
            users: usersData,
            drafts: draftsData,
            draftPicks: seasonDraftPicks
          };
          
          console.log(`Loaded ${season} season data:`, { 
            rosters: rostersData.length, 
            users: usersData.length,
            drafts: draftsData.length,
            totalPicks: Object.values(seasonDraftPicks).reduce((sum, picks) => sum + picks.length, 0)
          });
        } else {
          console.warn(`Could not find league ID for season ${season}`);
        }
      } catch (error) {
        console.warn(`Failed to load data for season ${season}:`, error);
      }
    }
    
    setCrossSeasonData(crossSeasonDataMap);
  };
  
  const findLeagueIdForSeason = (season: string): string | null => {
    // Find the league ID for a specific season within the consolidated league
    try {
      const targetSeason = league.seasons.find(s => s.season === season);
      if (targetSeason) {
        console.log(`Found league ID for season ${season}:`, targetSeason.league_id);
        return targetSeason.league_id;
      }
      
      // If not found in consolidated league, try current league for current season
      const currentSeason = league.mostRecentSeason.season;
      if (season === currentSeason) {
        return league.mostRecentSeason.league_id;
      }
      
      // Try to find using previous_league_id chain
      const currentYear = parseInt(currentSeason);
      const targetYear = parseInt(season);
      
      if (targetYear === currentYear - 1) {
        // Look for previous season in the consolidated league
        const previousSeason = league.seasons.find(s => parseInt(s.season) === targetYear);
        if (previousSeason) {
          return previousSeason.league_id;
        }
      }
      
      console.warn(`Could not find league ID for season ${season}`);
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
    
    console.log('Formatting draft pick:', {
      season: pickSeason,
      round: pick.round,
      original_owner: pick.original_owner || pick.previous_owner_id,
      owner_id: pick.owner_id,
      previous_owner_id: pick.previous_owner_id
    });
    
    const originalOwnerId = pick.original_owner || pick.previous_owner_id;
    const roundSuffix = pick.round === 1 ? 'st' : pick.round === 2 ? 'nd' : pick.round === 3 ? 'rd' : 'th';
    
    // Get data for the pick season and previous season
    const pickSeasonData = crossSeasonData[pickSeason];
    const previousSeason = (parseInt(pickSeason) - 1).toString();
    const previousSeasonData = crossSeasonData[previousSeason];
    
    console.log(`Data availability for ${pickSeason} pick:`, {
      pickSeasonData: !!pickSeasonData,
      previousSeason,
      previousSeasonData: !!previousSeasonData,
      originalOwnerId
    });
    
    // Find the original owner's info and calculate pick number
    let originalOwnerName = 'Unknown';
    let inferredPickNumber = '';
    let selectedPlayer = '';
    
    if (previousSeasonData && originalOwnerId) {
      // Find the original owner in the previous season to get their final rank
      const originalRoster = previousSeasonData.rosters.find(r => r.roster_id === originalOwnerId);
      console.log('Original roster found in previous season:', !!originalRoster, originalRoster?.roster_id);
      
      if (originalRoster) {
        const originalUser = previousSeasonData.users.find(u => u.user_id === originalRoster.owner_id);
        console.log('Original user found:', !!originalUser, originalUser?.username);
        
        if (originalUser) {
          originalOwnerName = originalUser.display_name || originalUser.username;
          
          // Calculate final rank and infer pick number
          const finalRank = calculateRankFromRecord(originalRoster, previousSeasonData.rosters);
          const totalTeams = previousSeasonData.rosters.length;
          const pickInRound = totalTeams - finalRank + 1;
          inferredPickNumber = `${pick.round}.${pickInRound.toString().padStart(2, '0')}`;
          
          console.log('Calculated pick info:', {
            finalRank,
            totalTeams,
            pickInRound,
            inferredPickNumber
          });
        }
      }
    }
    
    // Check if the draft for this pick season has occurred
    if (pickSeasonData && pickSeasonData.drafts.length > 0 && inferredPickNumber) {
      const draft = pickSeasonData.drafts[0]; // Assume first draft is the main draft
      const draftPicksForSeason = pickSeasonData.draftPicks[draft.draft_id] || [];
      
      console.log(`Draft data for ${pickSeason}:`, {
        draftId: draft.draft_id,
        totalPicks: draftPicksForSeason.length,
        inferredPickNumber
      });
      
      if (draftPicksForSeason.length > 0) {
        // Calculate overall pick number
        const [roundStr, pickInRoundStr] = inferredPickNumber.split('.');
        const roundNum = parseInt(roundStr);
        const pickInRound = parseInt(pickInRoundStr);
        const totalTeams = pickSeasonData.rosters.length;
        const overallPickNumber = ((roundNum - 1) * totalTeams) + pickInRound;
        
        console.log('Looking for overall pick number:', overallPickNumber);
        
        // Find the pick by overall pick number
        const draftPickDetail = draftPicksForSeason.find(p => p.pick_no === overallPickNumber);
        if (draftPickDetail && draftPickDetail.player_id) {
          selectedPlayer = getPlayerName(draftPickDetail.player_id);
          console.log('Found selected player:', selectedPlayer, 'for pick', overallPickNumber);
        }
      }
    }
    
    // Format the final display
    if (selectedPlayer && inferredPickNumber) {
      return `${pickSeason} ${pick.round}${roundSuffix} Round Pick (${inferredPickNumber} - ${selectedPlayer})`;
    } else if (inferredPickNumber && originalOwnerName !== 'Unknown') {
      return `${pickSeason} ${pick.round}${roundSuffix} Round Pick (${inferredPickNumber} - from ${originalOwnerName})`;
    } else if (inferredPickNumber) {
      return `${pickSeason} ${pick.round}${roundSuffix} Round Pick (${inferredPickNumber})`;
    }
    
    // Fallback when we can't infer the pick number
    return `${pickSeason} ${pick.round}${roundSuffix} Round Pick`;
  };
  
  const calculateRankFromRecord = (roster: SleeperRoster, allRosters: SleeperRoster[]): number => {
    console.log('Calculating rank for roster:', roster.roster_id, 'wins:', roster.settings.wins, 'points:', roster.settings.fpts);
    
    // Sort rosters by wins (desc), then by points for (desc)
    const sortedRosters = [...allRosters].sort((a, b) => {
      const aWins = a.settings.wins || 0;
      const bWins = b.settings.wins || 0;
      if (bWins !== aWins) return bWins - aWins;
      
      const aPoints = a.settings.fpts || 0;
      const bPoints = b.settings.fpts || 0;
      return bPoints - aPoints;
    });
    
    const rank = sortedRosters.findIndex(r => r.roster_id === roster.roster_id) + 1;
    console.log('Final rank:', rank, 'out of', allRosters.length, 'teams');
    return rank;
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