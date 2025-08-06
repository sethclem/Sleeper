import { SleeperLeague, SleeperRoster, SleeperUser, SleeperTrade, SleeperMatchup, TradeSimulationResult, TeamStanding, WeeklyImpact, TeamWeeklyImpact, PlayerInfo } from '../types/sleeper';
import { SleeperAPI } from './sleeperApi';

export class TradeSimulationEngine {
  private league: SleeperLeague;
  private originalRosters: SleeperRoster[];
  private users: SleeperUser[];
  private players: Record<string, PlayerInfo>;
  private allMatchups: Record<number, SleeperMatchup[]> = {};

  constructor(
    league: SleeperLeague,
    rosters: SleeperRoster[],
    users: SleeperUser[],
    players: Record<string, PlayerInfo>
  ) {
    this.league = league;
    this.originalRosters = rosters;
    this.users = users;
    this.players = players;
  }

  async simulateUndoTrades(tradesToUndo: SleeperTrade[]): Promise<TradeSimulationResult> {
    // Load all matchup data
    this.allMatchups = await SleeperAPI.getAllMatchups(this.league.league_id);
    
    // Create alternate timeline rosters by undoing trades
    const simulatedRosters = this.createAlternateRosters(tradesToUndo);
    
    // Calculate original standings
    const originalStandings = this.calculateStandings(this.originalRosters);
    
    // Simulate matchups with alternate rosters
    const simulatedMatchups = this.simulateMatchupsWithAlternateRosters(simulatedRosters);
    
    // Calculate simulated standings
    const simulatedStandings = this.calculateStandingsFromMatchups(simulatedMatchups, simulatedRosters);
    
    // Calculate weekly impact
    const weeklyImpact = this.calculateWeeklyImpact(simulatedMatchups);
    
    // Identify affected teams
    const affectedTeams = this.getAffectedTeams(tradesToUndo);

    return {
      originalStandings,
      simulatedStandings,
      weeklyImpact,
      affectedTeams
    };
  }

  private createAlternateRosters(tradesToUndo: SleeperTrade[]): SleeperRoster[] {
    // Start with current rosters
    const alternateRosters = JSON.parse(JSON.stringify(this.originalRosters));
    
    // Sort trades by date (oldest first) to undo them in reverse chronological order
    const sortedTrades = [...tradesToUndo].sort((a, b) => b.status_updated - a.status_updated);
    
    // Undo each trade
    sortedTrades.forEach(trade => {
      this.undoTrade(alternateRosters, trade);
    });
    
    return alternateRosters;
  }

  private undoTrade(rosters: SleeperRoster[], trade: SleeperTrade) {
    // Reverse the trade by swapping adds and drops
    Object.entries(trade.adds || {}).forEach(([playerId, rosterId]) => {
      const roster = rosters.find(r => r.roster_id === rosterId);
      if (roster) {
        // Remove player from current roster
        roster.players = roster.players.filter(p => p !== playerId);
        roster.starters = roster.starters.filter(p => p !== playerId);
      }
    });

    Object.entries(trade.drops || {}).forEach(([playerId, rosterId]) => {
      const roster = rosters.find(r => r.roster_id === rosterId);
      if (roster) {
        // Add player back to original roster
        if (!roster.players.includes(playerId)) {
          roster.players.push(playerId);
        }
      }
    });
  }

  private simulateMatchupsWithAlternateRosters(alternateRosters: SleeperRoster[]): Record<number, SleeperMatchup[]> {
    const simulatedMatchups: Record<number, SleeperMatchup[]> = {};
    
    Object.entries(this.allMatchups).forEach(([week, matchups]) => {
      const weekNum = parseInt(week);
      simulatedMatchups[weekNum] = matchups.map(matchup => {
        const alternateRoster = alternateRosters.find(r => r.roster_id === matchup.roster_id);
        if (!alternateRoster) return matchup;
        
        // Simulate points with alternate roster
        const simulatedPoints = this.calculateSimulatedPoints(matchup, alternateRoster);
        
        return {
          ...matchup,
          points: simulatedPoints,
          // Keep original starters and players_points for now
          // In a real implementation, you'd recalculate optimal lineups
        };
      });
    });
    
    return simulatedMatchups;
  }

  private calculateSimulatedPoints(originalMatchup: SleeperMatchup, alternateRoster: SleeperRoster): number {
    // This is a simplified simulation
    // In reality, you'd need to:
    // 1. Determine optimal lineup from alternate roster
    // 2. Calculate points based on actual player performances that week
    // 3. Account for bench players who might have been started
    
    // For now, we'll estimate based on roster changes
    let pointsAdjustment = 0;
    
    // Compare rosters and estimate point differences
    const originalPlayers = this.originalRosters.find(r => r.roster_id === alternateRoster.roster_id)?.players || [];
    const alternatePlayers = alternateRoster.players;
    
    // Players gained in alternate timeline
    const gainedPlayers = alternatePlayers.filter(p => !originalPlayers.includes(p));
    // Players lost in alternate timeline  
    const lostPlayers = originalPlayers.filter(p => !alternatePlayers.includes(p));
    
    // Estimate point impact (this is very simplified)
    // In reality, you'd look up actual weekly performances
    gainedPlayers.forEach(playerId => {
      const playerPoints = originalMatchup.players_points?.[playerId] || 0;
      pointsAdjustment += playerPoints;
    });
    
    lostPlayers.forEach(playerId => {
      const playerPoints = originalMatchup.players_points?.[playerId] || 0;
      pointsAdjustment -= playerPoints;
    });
    
    return Math.max(0, originalMatchup.points + pointsAdjustment);
  }

  private calculateStandings(rosters: SleeperRoster[]): TeamStanding[] {
    return rosters
      .map((roster, index) => ({
        rosterId: roster.roster_id,
        teamName: this.getTeamName(roster),
        wins: roster.settings.wins || 0,
        losses: roster.settings.losses || 0,
        ties: roster.settings.ties || 0,
        pointsFor: roster.settings.fpts || 0,
        pointsAgainst: roster.settings.fpts_against || 0,
        rank: index + 1
      }))
      .sort((a, b) => {
        // Sort by wins first, then by points
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.pointsFor - a.pointsFor;
      })
      .map((team, index) => ({ ...team, rank: index + 1 }));
  }

  private calculateStandingsFromMatchups(matchups: Record<number, SleeperMatchup[]>, rosters: SleeperRoster[]): TeamStanding[] {
    const teamStats: Record<number, { wins: number; losses: number; ties: number; pointsFor: number; pointsAgainst: number }> = {};
    
    // Initialize stats
    rosters.forEach(roster => {
      teamStats[roster.roster_id] = {
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0
      };
    });
    
    // Calculate stats from simulated matchups
    Object.values(matchups).forEach(weekMatchups => {
      // Group by matchup_id to find opponents
      const matchupGroups: Record<number, SleeperMatchup[]> = {};
      weekMatchups.forEach(matchup => {
        if (!matchupGroups[matchup.matchup_id]) {
          matchupGroups[matchup.matchup_id] = [];
        }
        matchupGroups[matchup.matchup_id].push(matchup);
      });
      
      // Process each matchup
      Object.values(matchupGroups).forEach(matchupPair => {
        if (matchupPair.length === 2) {
          const [team1, team2] = matchupPair;
          
          teamStats[team1.roster_id].pointsFor += team1.points;
          teamStats[team1.roster_id].pointsAgainst += team2.points;
          teamStats[team2.roster_id].pointsFor += team2.points;
          teamStats[team2.roster_id].pointsAgainst += team1.points;
          
          if (team1.points > team2.points) {
            teamStats[team1.roster_id].wins++;
            teamStats[team2.roster_id].losses++;
          } else if (team2.points > team1.points) {
            teamStats[team2.roster_id].wins++;
            teamStats[team1.roster_id].losses++;
          } else {
            teamStats[team1.roster_id].ties++;
            teamStats[team2.roster_id].ties++;
          }
        }
      });
    });
    
    // Convert to standings format
    return rosters
      .map(roster => ({
        rosterId: roster.roster_id,
        teamName: this.getTeamName(roster),
        wins: teamStats[roster.roster_id].wins,
        losses: teamStats[roster.roster_id].losses,
        ties: teamStats[roster.roster_id].ties,
        pointsFor: Math.round(teamStats[roster.roster_id].pointsFor * 100) / 100,
        pointsAgainst: Math.round(teamStats[roster.roster_id].pointsAgainst * 100) / 100,
        rank: 0
      }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.pointsFor - a.pointsFor;
      })
      .map((team, index) => ({ ...team, rank: index + 1 }));
  }

  private calculateWeeklyImpact(simulatedMatchups: Record<number, SleeperMatchup[]>): WeeklyImpact[] {
    const weeklyImpact: WeeklyImpact[] = [];
    
    Object.entries(simulatedMatchups).forEach(([week, matchups]) => {
      const weekNum = parseInt(week);
      const originalMatchups = this.allMatchups[weekNum] || [];
      
      const teamImpacts: TeamWeeklyImpact[] = matchups.map(simulatedMatchup => {
        const originalMatchup = originalMatchups.find(m => m.roster_id === simulatedMatchup.roster_id);
        if (!originalMatchup) {
          return {
            rosterId: simulatedMatchup.roster_id,
            teamName: this.getTeamNameByRosterId(simulatedMatchup.roster_id),
            originalPoints: 0,
            simulatedPoints: simulatedMatchup.points,
            difference: simulatedMatchup.points,
            originalResult: 'L',
            simulatedResult: 'L'
          };
        }
        
        return {
          rosterId: simulatedMatchup.roster_id,
          teamName: this.getTeamNameByRosterId(simulatedMatchup.roster_id),
          originalPoints: Math.round(originalMatchup.points * 100) / 100,
          simulatedPoints: Math.round(simulatedMatchup.points * 100) / 100,
          difference: Math.round((simulatedMatchup.points - originalMatchup.points) * 100) / 100,
          originalResult: this.getMatchupResult(originalMatchup, originalMatchups),
          simulatedResult: this.getMatchupResult(simulatedMatchup, matchups)
        };
      });
      
      weeklyImpact.push({
        week: weekNum,
        teamImpacts
      });
    });
    
    return weeklyImpact.sort((a, b) => a.week - b.week);
  }

  private getMatchupResult(matchup: SleeperMatchup, allMatchups: SleeperMatchup[]): 'W' | 'L' | 'T' {
    const opponent = allMatchups.find(m => 
      m.matchup_id === matchup.matchup_id && m.roster_id !== matchup.roster_id
    );
    
    if (!opponent) return 'L';
    
    if (matchup.points > opponent.points) return 'W';
    if (matchup.points < opponent.points) return 'L';
    return 'T';
  }

  private getAffectedTeams(trades: SleeperTrade[]): string[] {
    const affectedTeams = new Set<string>();
    
    trades.forEach(trade => {
      trade.roster_ids.forEach(rosterId => {
        affectedTeams.add(rosterId.toString());
      });
    });
    
    return Array.from(affectedTeams);
  }

  private getTeamName(roster: SleeperRoster): string {
    const user = this.users.find(u => u.user_id === roster.owner_id);
    return user?.display_name || user?.username || `Team ${roster.roster_id}`;
  }

  private getTeamNameByRosterId(rosterId: number): string {
    const roster = this.originalRosters.find(r => r.roster_id === rosterId);
    return roster ? this.getTeamName(roster) : `Team ${rosterId}`;
  }
}