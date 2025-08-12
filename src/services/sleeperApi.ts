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
  status: string;
  sport: string;
  settings: {
    num_teams: number;
    playoff_week_start: number;
  };
  scoring_settings: Record<string, number>;
  roster_positions: string[];
  previous_league_id?: string;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  players: string[];
  starters: string[];
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_against: number;
  };
}

export interface SleeperTransaction {
  transaction_id: string;
  type: string;
  status: string;
  roster_ids: number[];
  week: number;
  status_updated: number;
  adds?: Record<string, number>;
  drops?: Record<string, number>;
  draft_picks?: Array<{
    season: string;
    round: number;
    roster_id: number;
    previous_owner_id?: number;
    owner_id?: number;
  }>;
}

export interface PlayerInfo {
  player_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string;
  status: string;
}

export interface DraftInfo {
  draft_id: string;
  season: string;
  type: string;
  status: string;
  settings: {
    rounds: number;
    teams: number;
  };
}

export interface DraftPickDetail {
  pick_no: number;
  player_id: string;
  roster_id: number;
  round: number;
  draft_slot: number;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class SleeperAPI {
  private static readonly BASE_URL = 'https://api.sleeper.app/v1';

  static async getUser(username: string): Promise<SleeperUser> {
    const response = await fetch(`${this.BASE_URL}/user/${username}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }
    return response.json();
  }

  static async getUserLeagues(userId: string, season: string): Promise<SleeperLeague[]> {
    const response = await fetch(`${this.BASE_URL}/user/${userId}/leagues/nfl/${season}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch leagues: ${response.statusText}`);
    }
    return response.json();
  }

  static async getLeague(leagueId: string): Promise<SleeperLeague> {
    const response = await fetch(`${this.BASE_URL}/league/${leagueId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch league: ${response.statusText}`);
    }
    return response.json();
  }

  static async getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
    const response = await fetch(`${this.BASE_URL}/league/${leagueId}/users`);
    if (!response.ok) {
      throw new Error(`Failed to fetch league users: ${response.statusText}`);
    }
    return response.json();
  }

  static async getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
    const response = await fetch(`${this.BASE_URL}/league/${leagueId}/rosters`);
    if (!response.ok) {
      throw new Error(`Failed to fetch league rosters: ${response.statusText}`);
    }
    return response.json();
  }

  static async getTransactions(leagueId: string, week: number): Promise<SleeperTransaction[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/league/${leagueId}/transactions/${week}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions for week ${week}: ${response.statusText}`);
      }
      await delay(100); // Add delay to prevent rate limiting
      return response.json();
    } catch (error) {
      console.error(`Error fetching transactions for week ${week}:`, error);
      throw error;
    }
  }

  static async getAllTransactions(leagueId: string): Promise<SleeperTransaction[]> {
    const allTransactions: SleeperTransaction[] = [];
    
    // Fetch transactions for weeks 1-18 (regular season + playoffs)
    for (let week = 1; week <= 18; week++) {
      try {
        const weekTransactions = await this.getTransactions(leagueId, week);
        allTransactions.push(...weekTransactions);
      } catch (error) {
        console.warn(`Failed to fetch transactions for week ${week}:`, error);
      }
    }
    
    return allTransactions;
  }

  static async getAllTrades(leagueId: string): Promise<SleeperTransaction[]> {
    const allTransactions = await this.getAllTransactions(leagueId);
    return allTransactions.filter(transaction => transaction.type === 'trade');
  }

  static async getPlayers(): Promise<Record<string, PlayerInfo>> {
    const response = await fetch(`${this.BASE_URL}/players/nfl`);
    if (!response.ok) {
      throw new Error(`Failed to fetch players: ${response.statusText}`);
    }
    return response.json();
  }

  static async getLeagueDrafts(leagueId: string): Promise<DraftInfo[]> {
    const response = await fetch(`${this.BASE_URL}/league/${leagueId}/drafts`);
    if (!response.ok) {
      throw new Error(`Failed to fetch league drafts: ${response.statusText}`);
    }
    return response.json();
  }

  static async getDraftPicks(draftId: string): Promise<DraftPickDetail[]> {
    const response = await fetch(`${this.BASE_URL}/draft/${draftId}/picks`);
    if (!response.ok) {
      throw new Error(`Failed to fetch draft picks: ${response.statusText}`);
    }
    return response.json();
  }
}