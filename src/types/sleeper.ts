export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  season_type: string;
  total_rosters: number;
  status: string;
  sport: string;
  settings: {
    max_keepers: number;
    draft_rounds: number;
    trade_deadline: number;
    playoff_week_start: number;
    num_teams: number;
    type: number;
    pick_trading: number;
    taxi_years: number;
    taxi_slots: number;
    taxi_allow_vets: number;
    best_ball: number;
  };
  scoring_settings: Record<string, number>;
  roster_positions: string[];
  previous_league_id: string;
  draft_id: string;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  user_id: string;
  league_id: string;
  players: string[];
  starters: string[];
  settings: {
    wins: number;
    waiver_position: number;
    waiver_budget_used: number;
    total_moves: number;
    ties: number;
    losses: number;
    fpts: number;
    fpts_decimal: number;
    fpts_against: number;
    fpts_against_decimal: number;
  };
  metadata: {
    streak: string;
    record: string;
  };
}

export interface SleeperMatchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  players: string[];
  starters: string[];
  players_points: Record<string, number>;
  starters_points: number[];
  custom_points: number;
}

export interface SleeperTransaction {
  transaction_id: string;
  type: string;
  status: string;
  status_updated: number;
  created: number;
  roster_ids: number[];
  settings: {
    waiver_bid: number;
  };
  metadata: {
    notes: string;
  };
  adds: Record<string, number>;
  drops: Record<string, number>;
  draft_picks: any[];
  creator: string;
  consenter_ids: number[];
  waiver_budget: any[];
}

export interface SleeperTrade {
  transaction_id: string;
  type: 'trade';
  status: string;
  status_updated: number;
  created: number;
  roster_ids: number[];
  adds: Record<string, number>;
  drops: Record<string, number>;
  draft_picks: any[];
  creator: string;
  consenter_ids: number[];
  week: number;
}

export interface TradeSimulationResult {
  originalStandings: TeamStanding[];
  simulatedStandings: TeamStanding[];
  weeklyImpact: WeeklyImpact[];
  affectedTeams: string[];
}

export interface TeamStanding {
  rosterId: number;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
}

export interface WeeklyImpact {
  week: number;
  teamImpacts: TeamWeeklyImpact[];
}

export interface TeamWeeklyImpact {
  rosterId: number;
  teamName: string;
  originalPoints: number;
  simulatedPoints: number;
  difference: number;
  originalResult: 'W' | 'L' | 'T';
  simulatedResult: 'W' | 'L' | 'T';
}

export interface PlayerInfo {
  player_id: string;
  full_name: string;
  position: string;
  team: string;
}

export interface LeagueStats {
  totalTeams: number;
  totalTransactions: number;
  averageScore: number;
  highestScore: number;
  topScorer: string;
}