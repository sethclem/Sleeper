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
    
    // Identify all seasons needed for draft picks
    trades.forEach(trade => {
      (trade.draft_picks || []).forEach(pick => {
        const pickYear = parseInt(pick.season);
        
        // Always need the pick season for draft results (if available)
        seasonsNeeded.add(pick.season);
        
        // Always need the previous season for standings/draft order
        const previousSeason = (parseInt(pick.season) - 1).toString();
        if (parseInt(previousSeason) >= 2018) {
          seasonsNeeded.add(previousSeason);
        }
      });
    });
    
    console.log('🔍 Seasons needed:', Array.from(seasonsNeeded).sort());
    
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
        console.log(`📅 Season ${season}: League ID = ${leagueIdForSeason}`);
        
        if (leagueIdForSeason) {
          const [rostersData, usersData, draftsData] = await Promise.all([
            SleeperAPI.getLeagueRosters(leagueIdForSeason),
            SleeperAPI.getLeagueUsers(leagueIdForSeason),
            SleeperAPI.getLeagueDrafts(leagueIdForSeason)
          ]);
          
          // Load draft picks for this season
          const seasonDraftPicks: Record<string, DraftPickDetail[]> = {};
          for (const draft of draftsData) {
            try {
              const picks = await SleeperAPI.getDraftPicks(draft.draft_id);
              seasonDraftPicks[draft.draft_id] = picks;
            } catch (error) {
              console.warn(`Failed to load picks for draft ${draft.draft_id}:`, error);
              seasonDraftPicks[draft.draft_id] = [];
            }
          }
          
          crossSeasonDataMap[season] = {
            rosters: rostersData,
            users: usersData,
            drafts: draftsData,
            draftPicks: seasonDraftPicks
          };
          
          const totalPicks = Object.values(seasonDraftPicks).reduce((sum, picks) => sum + picks.length, 0);
          console.log(`✅ ${season}: ${rostersData.length} teams, ${draftsData.length} drafts, ${totalPicks} picks`);
        } else {
          console.warn(`❌ No league ID found for season ${season}`);
        }
      } catch (error) {
        console.error(`❌ Failed to load season ${season}:`, error);
      }
    }
    
    setCrossSeasonData(crossSeasonDataMap);
  };
  
  const findLeagueIdForSeason = (season: string): string | null => {
    try {
      // First, try to find exact match
      const targetSeason = league.seasons.find(s => s.season === season);
      if (targetSeason) {
        return targetSeason.league_id;
      }
      
      const targetYear = parseInt(season);
      const mostRecentYear = parseInt(league.mostRecentSeason.season);
      const currentYear = new Date().getFullYear();
      
      // For future seasons, use the most recent league ID
      if (targetYear > mostRecentYear) {
        return league.mostRecentSeason.league_id;
      }
      
      // For past seasons, try to find via previous_league_id chain
      for (const leagueSeason of league.seasons) {
        if (parseInt(leagueSeason.season) === targetYear + 1 && leagueSeason.previous_league_id) {
          return leagueSeason.previous_league_id;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error finding league ID for season ${season}:`, error);
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
    const pickYear = parseInt(pick.season);
    const currentYear = new Date().getFullYear();
    const standingsYear = pickYear - 1;
    
    console.log(`\n🎯 Formatting ${pick.season} Round ${pick.round} pick`);
    
    const roundSuffix = pick.round === 1 ? 'st' : pick.round === 2 ? 'nd' : pick.round === 3 ? 'rd' : 'th';
    const originalOwnerId = pick.original_owner || pick.previous_owner_id;
    
    const isPastSeason = pickYear < currentYear;
    const isCurrentSeason = pickYear === currentYear;
    const isFutureSeason = pickYear > currentYear;
    const standingsData = crossSeasonData[standingsYear.toString()];
    // Check if the standings season has occurred (completed)
    const standingsSeasonHasOccurred = standingsYear < currentYear || 
      (standingsYear === currentYear && isSeasonComplete());
    
    if (!standingsSeasonHasOccurred) {
      console.log(`⏸️ Standings season ${standingsYear} has not occurred/completed yet`);
      return `${pick.season} ${pick.round}${roundSuffix} Round Pick`;
    }
    
    // Get draft data from the pick year
    const draftData = crossSeasonData[pick.season];
    
    console.log(`📊 Data availability: Standings(${standingsYear}): ${!!standingsData}, Draft(${pick.season}): ${!!draftData}`);
    
    // Calculate draft position using previous season's standings
    let draftPosition = '';
    let originalOwnerName = 'Unknown';
    
    if (!standingsData || !standingsData.rosters.length) {
      console.warn(`❌ No standings data for ${standingsYear}`);
      return `${pick.season} ${pick.round}${roundSuffix} Round Pick`;
    }
    
    if (originalOwnerId) {
      const originalRoster = standingsData.rosters.find(r => r.roster_id === originalOwnerId);
      if (originalRoster) {
        const originalUser = standingsData.users.find(u => u.user_id === originalRoster.owner_id);
        if (originalUser) {
          originalOwnerName = originalUser.display_name || originalUser.username;
          const finalRank = calculateRankFromRecord(originalRoster, standingsData.rosters);
          const totalTeams = standingsData.rosters.length;
          const pickInRound = totalTeams - finalRank + 1;
          draftPosition = `${pick.round}.${pickInRound.toString().padStart(2, '0')}`;
          console.log(`📈 ${originalOwnerName} finished rank ${finalRank}/${totalTeams} → pick ${draftPosition}`);
        }
      }
    }
    
    if (!draftPosition) {
      return `${pick.season} ${pick.round}${roundSuffix} Round Pick`;
    }
    
    // Determine what to show based on pick year vs current year
    if (pickYear <= currentYear) {
      // Past or current season - try to find the drafted player
      const selectedPlayer = findDraftedPlayer(draftData, draftPosition, standingsData.rosters.length);
      if (selectedPlayer) {
        console.log(`✅ Found drafted player: ${selectedPlayer}`);
        return `${pick.season} ${pick.round}${roundSuffix} Round Pick (${selectedPlayer})`;
      } else {
        console.log(`❌ No drafted player found for ${draftPosition}`);
        return `${pick.season} ${pick.round}${roundSuffix} Round Pick (${draftPosition})`;
      }
    } else {
      // Future season
      if (draftData && draftData.drafts.length > 0) {
        // Draft has occurred for future season
        const selectedPlayer = findDraftedPlayer(draftData, draftPosition, standingsData.rosters.length);
        if (selectedPlayer) {
          console.log(`✅ Found future drafted player: ${selectedPlayer}`);
          return `${pick.season} ${pick.round}${roundSuffix} Round Pick (${selectedPlayer})`;
        }
      }
      // Draft hasn't occurred yet or no player found
      console.log(`⏳ Future pick, showing position: ${draftPosition}`);
      return `${pick.season} ${pick.round}${roundSuffix} Round Pick (${draftPosition})`;
    }
  };
  
  const isSeasonComplete = () => {
    // This is a simplified check - in reality you'd check if playoffs are done
    // For now, assume current season is not complete
    return false;
  };
  
  const findDraftedPlayer = (draftData: any, draftPosition: string, totalTeams: number): string | null => {
    if (!draftData || !draftData.drafts.length) {
      console.log(`❌ No draft data available`);
      return null;
    }
    
    const draft = draftData.drafts[0]; // Use first draft
    const draftPicks = draftData.draftPicks[draft.draft_id] || [];
    
    if (!draftPicks.length) {
      console.log(`❌ No draft picks found for draft ${draft.draft_id}`);
      return null;
    }
    
    // Calculate overall pick number from position (e.g., "1.08" → pick 8)
    const [roundStr, pickInRoundStr] = draftPosition.split('.');
    const roundNum = parseInt(roundStr);
    const pickInRound = parseInt(pickInRoundStr);
    const overallPickNumber = ((roundNum - 1) * totalTeams) + pickInRound;
    
    console.log(`🔍 Looking for overall pick ${overallPickNumber} (${draftPosition}) in ${draftPicks.length} picks`);
    
    const selectedPick = draftPicks.find(p => p.pick_no === overallPickNumber);
    if (selectedPick && selectedPick.player_id) {
      return getPlayerName(selectedPick.player_id);
    }
    
    console.log(`❌ Pick ${overallPickNumber} not found or missing player_id`);
    return null;
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
    
    const rank = sortedRosters.findIndex(r => r.roster_id === roster.roster_id) + 1;
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
      // Future season - draft hasn't occurred yet, show calculated position
      // Find who sent the pick
      const sender = tradeDetails.find(d => getUserByRosterId(pick.previous_owner_id)?.user_id === d.user.user_id);
      if (sender) {
        sender.sentPicks.push(formatDraftPick(pick));
      }
    });

    return tradeDetails;
    
    return `${pick.season} ${pick.round}${roundSuffix} Round Pick`;
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