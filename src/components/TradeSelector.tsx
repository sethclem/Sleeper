import React, { useState } from 'react';
import { Calendar, Users, ArrowRight } from 'lucide-react';
import { SleeperTrade, SleeperUser, SleeperRoster, PlayerInfo, DraftPick, DraftInfo, DraftPickDetail, ConsolidatedLeague } from '../types/sleeper';
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
  const [multiSeasonData, setMultiSeasonData] = useState<Record<string, {
    rosters: SleeperRoster[];
    users: SleeperUser[];
    drafts: DraftInfo[];
    draftPicks: Record<string, DraftPickDetail[]>;
    leagueId: string;
    seasonComplete: boolean;
  }>>({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const [seasonToLeagueId, setSeasonToLeagueId] = useState<Record<string, string>>({});

  React.useEffect(() => {
    loadMultiSeasonData();
  }, [leagueId]);

  const loadMultiSeasonData = async () => {
    if (dataLoaded) return;
    
    try {
      console.log('🚀 Loading multi-season data for trades...');
      
      // Build season to league ID mapping
      const seasonMapping = buildSeasonToLeagueIdMapping();
      setSeasonToLeagueId(seasonMapping);
      
      // Identify all seasons needed for trades
      const seasonsNeeded = identifySeasonsNeededForTrades();
      console.log('📅 Seasons needed:', Array.from(seasonsNeeded).sort());
      
      // Load data for each season
      const multiSeasonDataMap = await loadDataForSeasons(seasonsNeeded, seasonMapping);
      setMultiSeasonData(multiSeasonDataMap);
      
      setDataLoaded(true);
      console.log('✅ Multi-season data loading complete');
    } catch (error) {
      console.error('❌ Error loading multi-season data:', error);
    }
  };

  const buildSeasonToLeagueIdMapping = (): Record<string, string> => {
    const mapping: Record<string, string> = {};
    
    // Map each season to its league ID
    league.seasons.forEach(season => {
      mapping[season.season] = season.league_id;
    });
    
    // For seasons not in our league history, try to infer
    const currentYear = new Date().getFullYear();
    const mostRecentSeason = league.mostRecentSeason;
    
    // For future seasons, use the most recent league ID
    for (let year = parseInt(mostRecentSeason.season) + 1; year <= currentYear + 5; year++) {
      if (!mapping[year.toString()]) {
        mapping[year.toString()] = mostRecentSeason.league_id;
      }
    }
    
    // For past seasons, try to use previous_league_id chain
    league.seasons.forEach(season => {
      if (season.previous_league_id) {
        const previousYear = (parseInt(season.season) - 1).toString();
        if (!mapping[previousYear] && parseInt(previousYear) >= 2018) {
          mapping[previousYear] = season.previous_league_id;
        }
      }
    });
    
    return mapping;
  };
  
  const identifySeasonsNeededForTrades = (): Set<string> => {
    const seasonsNeeded = new Set<string>();
    
    trades.forEach(trade => {
      (trade.draft_picks || []).forEach(pick => {
        // Need the pick's season for draft results
        seasonsNeeded.add(pick.season);
        
        // Need the previous season for standings (draft order)
        const previousSeason = (parseInt(pick.season) - 1).toString();
        if (parseInt(previousSeason) >= 2018) {
          seasonsNeeded.add(previousSeason);
        }
      });
    });
    
    return seasonsNeeded;
  };
  
  const loadDataForSeasons = async (
    seasonsNeeded: Set<string>, 
    seasonMapping: Record<string, string>
  ): Promise<Record<string, {
    rosters: SleeperRoster[];
    users: SleeperUser[];
    drafts: DraftInfo[];
    draftPicks: Record<string, DraftPickDetail[]>;
    leagueId: string;
    seasonComplete: boolean;
  }>> => {
    const dataMap: Record<string, any> = {};
    const currentYear = new Date().getFullYear();
    
    for (const season of seasonsNeeded) {
      const leagueIdForSeason = seasonMapping[season];
      if (!leagueIdForSeason) {
        console.warn(`❌ No league ID found for season ${season}`);
        continue;
      }
      
      try {
        console.log(`📅 Loading season ${season} (League ID: ${leagueIdForSeason})`);
        
        const [rostersData, usersData, draftsData] = await Promise.all([
          SleeperAPI.getLeagueRosters(leagueIdForSeason),
          SleeperAPI.getLeagueUsers(leagueIdForSeason),
          SleeperAPI.getLeagueDrafts(leagueIdForSeason)
        ]);
        
        // Load draft picks for all drafts in this season
        const seasonDraftPicks: Record<string, DraftPickDetail[]> = {};
        for (const draft of draftsData) {
          try {
            const picks = await SleeperAPI.getDraftPicks(draft.draft_id);
            seasonDraftPicks[draft.draft_id] = picks;
          } catch (error) {
            console.warn(`⚠️ Failed to load picks for draft ${draft.draft_id}:`, error);
            seasonDraftPicks[draft.draft_id] = [];
          }
        }
        
        // Determine if season is complete
        const seasonYear = parseInt(season);
        const seasonComplete = seasonYear < currentYear || 
          (seasonYear === currentYear && isSeasonComplete(season));
        
        dataMap[season] = {
          rosters: rostersData,
          users: usersData,
          drafts: draftsData,
          draftPicks: seasonDraftPicks,
          leagueId: leagueIdForSeason,
          seasonComplete
        };
        
        const totalPicks = Object.values(seasonDraftPicks).reduce((sum, picks) => sum + picks.length, 0);
        console.log(`✅ ${season}: ${rostersData.length} teams, ${draftsData.length} drafts, ${totalPicks} picks, complete: ${seasonComplete}`);
        
      } catch (error) {
        console.error(`❌ Failed to load season ${season}:`, error);
      }
    }
    
    return dataMap;
  };
  
  const isSeasonComplete = (season: string): boolean => {
    // This is a simplified check - in reality you'd check if playoffs are done
    // For now, assume current season is not complete unless it's past seasons
    const currentYear = new Date().getFullYear();
    const seasonYear = parseInt(season);
    return seasonYear < currentYear;
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
    console.log(`\n🎯 Formatting ${pick.season} Round ${pick.round} pick`);
    
    const currentYear = new Date().getFullYear();
    const pickYear = parseInt(pick.season);
    const standingsYear = (pickYear - 1).toString();
    
    // Get data for both seasons - CRITICAL: Use pick.season for draft data
    const pickSeasonData = multiSeasonData[pick.season];  // This should have 2025 draft data
    const standingsSeasonData = multiSeasonData[standingsYear];
    
    console.log(`📊 Pick season (${pick.season}): ${!!pickSeasonData}, Standings season (${standingsYear}): ${!!standingsSeasonData}`);
    
    if (pickSeasonData) {
      console.log(`📊 Pick season data for ${pick.season}:`, {
        drafts: pickSeasonData.drafts.length,
        draftIds: pickSeasonData.drafts.map(d => `${d.draft_id} (${d.season})`),
        totalPicks: Object.values(pickSeasonData.draftPicks).reduce((sum, picks) => sum + picks.length, 0)
      });
    }
    
    // Determine season status
    const isPastOrCurrentSeason = pickYear <= currentYear;
    const standingsSeasonComplete = standingsSeasonData?.seasonComplete || false;
    
    // Base format
    const roundSuffix = pick.round === 1 ? 'st' : pick.round === 2 ? 'nd' : pick.round === 3 ? 'rd' : 'th';
    let result = `${pick.season} ${pick.round}${roundSuffix} Round Pick`;
    
    // If we don't have standings data or season isn't complete, return basic format
    if (!standingsSeasonData || !standingsSeasonComplete) {
      console.log(`⏸️ Standings season ${standingsYear} not complete or no data available`);
      return result;
    }
    
    // Calculate draft slot from standings
    const draftSlot = calculateDraftSlot(pick, standingsSeasonData);
    if (draftSlot) {
      result += ` ${draftSlot}`;
      console.log(`📍 Draft slot calculated: ${draftSlot}`);
    }
    
    // For past/current seasons, try to find the drafted player
    if (isPastOrCurrentSeason && pickSeasonData) {
      const draftedPlayer = findDraftedPlayerFromUnifiedData(pick, draftSlot);
      if (draftedPlayer) {
        result += ` (${draftedPlayer})`;
        console.log(`👤 Drafted player found: ${draftedPlayer}`);
      }
    }
    
    console.log(`✅ Final format: ${result}`);
    return result;
  };
  
  const calculateDraftSlot = (pick: DraftPick, standingsData: any): string | null => {
    const originalOwnerId = pick.owner_id || pick.previous_owner_id || pick.roster_id;
    if (!originalOwnerId) {
      console.warn('❌ No original owner ID found for pick');
      return null;
    }
    
    // Find the roster in standings data
    const originalRoster = standingsData.rosters.find((r: SleeperRoster) => r.roster_id === originalOwnerId);
    if (!originalRoster) {
      console.warn(`❌ Original roster ${originalOwnerId} not found in standings`);
      return null;
    }
    
    // Calculate final rank
    const finalRank = calculateFinalRank(originalRoster, standingsData.rosters);
    const roundNum = pick.round;
    const slotNum = finalRank.toString().padStart(2, '0');
    
    return `${roundNum}.${slotNum}`;
  };
  
  const calculateFinalRank = (roster: SleeperRoster, allRosters: SleeperRoster[]): number => {
    // Sort rosters by wins (desc), then by points for (desc)
    const sortedRosters = [...allRosters].sort((a, b) => {
      const aWins = a.settings.wins || 0;
      const bWins = b.settings.wins || 0;
      if (bWins !== aWins) return bWins - aWins;
      
      const aPoints = a.settings.fpts || 0;
      const bPoints = b.settings.fpts || 0;
      return bPoints - aPoints;
    });
    
    // Find rank (1-based)
    const rank = sortedRosters.findIndex(r => r.roster_id === roster.roster_id) + 1;
    return rank;
  };
  
  const findDraftedPlayerFromUnifiedData = (pick: DraftPick, draftSlot: string | null): string | null => {
    const pickYear = parseInt(pick.season);
    const currentYear = new Date().getFullYear();
    
    // Don't show players for future drafts
    if (pickYear > currentYear) {
      console.log(`🚫 ${pickYear} is future, no player available`);
      return null;
    }
    
    // Get drafts for the pick's season
    const seasonDrafts = unifiedLeagueData.allDrafts[pick.season];
    if (!seasonDrafts || !seasonDrafts.length) {
      console.log(`❌ No drafts found for ${pick.season}`);
      return null;
    }
    
    // Use the first draft (main draft)
    const draft = seasonDrafts[0];
    if (draft.season !== pick.season) {
      console.log(`🚫 Draft season mismatch: expected ${pick.season}, got ${draft.season}`);
      return null;
    }
    
    // Get draft picks for this draft
    const draftPicks = unifiedLeagueData.allDraftPicks[draft.draft_id] || [];
    if (!draftPicks.length) {
      console.log(`❌ No picks found for draft ${draft.draft_id}`);
      return null;
    }
    
    console.log(`🎯 Searching ${draftPicks.length} picks in ${pick.season} draft`);

    // Try to find by slot if we have it
    if (draftSlot) {
      const [roundStr, slotStr] = draftSlot.split('.');
      const targetRound = parseInt(roundStr);
      const targetSlot = parseInt(slotStr);
      
      const totalTeams = unifiedLeagueData.allRosters[pick.season]?.length || 12;
      const targetPickNumber = (targetRound - 1) * totalTeams + targetSlot;
      
      const foundPick = draftPicks.find(p => p.pick_no === targetPickNumber);
      if (foundPick && foundPick.player_id) {
        const playerName = getPlayerName(foundPick.player_id);
        console.log(`✅ Found by slot: ${playerName}`);
        return playerName;
      }
    }
    
    // Fallback: find by owner and round
    const originalOwnerId = pick.owner_id || pick.previous_owner_id || pick.roster_id;
    if (originalOwnerId) {
      const totalTeams = unifiedLeagueData.allRosters[pick.season]?.length || 12;
      const ownerPicksInRound = draftPicks.filter(p => 
        p.roster_id === originalOwnerId && 
        Math.ceil(p.pick_no / totalTeams) === pick.round
      );
      
      if (ownerPicksInRound.length > 0 && ownerPicksInRound[0].player_id) {
        const playerName = getPlayerName(ownerPicksInRound[0].player_id);
        console.log(`✅ Found by owner+round: ${playerName}`);
        return playerName;
      }
    }
    
    console.log(`❌ No player found for ${pick.season} R${pick.round}`);
    return null;
  };
  
  const findDraftedPlayerFromExactSeason = (pick: DraftPick, pickSeasonData: any): string | null => {
    // CRITICAL: Only look for players in the EXACT same year as the pick
    const pickYear = parseInt(pick.season);
    const currentYear = new Date().getFullYear();
    
    console.log(`🔍 Searching for player in ${pick.season} draft only`);
    
    // If this is a future draft, absolutely no player should be shown
    if (pickYear > currentYear) {
      console.log(`🚫 Pick is for ${pickYear}, which is in the future. No player available.`);
      return null;
    }
    
    // Verify we have draft data for the EXACT pick season
    if (!pickSeasonData || !pickSeasonData.drafts.length) {
      console.log(`❌ No draft data found for pick season ${pick.season}`);
      return null;
    }
    
    // Get the draft from the pick's exact season
    const draft = pickSeasonData.drafts[0];
    
    // DOUBLE CHECK: Verify this draft is actually from the pick's season
    if (draft.season !== pick.season) {
      console.log(`🚫 CRITICAL: Draft season mismatch! Pick: ${pick.season}, Draft: ${draft.season}`);
      return null;
    }
    
    const draftPicks = pickSeasonData.draftPicks[draft.draft_id] || [];
    
    if (!draftPicks.length) {
      console.log(`❌ No draft picks found for ${pick.season} draft`);
      return null;
    }
    
    console.log(`🎯 Searching ${draftPicks.length} picks from ${pick.season} draft`);
    
    // Method 1: Find by original owner and round in the EXACT season
    const originalOwnerId = pick.owner_id || pick.previous_owner_id || pick.roster_id;
    if (originalOwnerId) {
      const ownerPicksInRound = draftPicks.filter(p => 
        p.roster_id === originalOwnerId && 
        Math.ceil(p.pick_no / pickSeasonData.rosters.length) === pick.round
      );
      
      if (ownerPicksInRound.length > 0 && ownerPicksInRound[0].player_id) {
        const playerName = getPlayerName(ownerPicksInRound[0].player_id);
        console.log(`✅ Found player by owner+round: ${playerName}`);
        return playerName;
      }
    }
    
    console.log(`❌ No player found in ${pick.season} draft`);
    return null;
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
      const receivedPicks: string[] = [];
      const sentPicks: string[] = [];
      
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
      
      // Find draft picks this roster received
      (trade.draft_picks || []).forEach(pick => {
        if (pick.roster_id === rosterId) {
          receivedPicks.push(formatDraftPick(pick));
        }
      });
      
      // Find draft picks this roster sent
      (trade.draft_picks || []).forEach(pick => {
        if (pick.previous_owner_id === rosterId) {
          sentPicks.push(formatDraftPick(pick));
        }
      });
      
      tradeDetails.push({
        user,
        received,
        sent,
        receivedPicks,
        sentPicks
      });
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