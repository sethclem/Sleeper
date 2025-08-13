import { SleeperTrade, SleeperUser, SleeperRoster, PlayerInfo, DraftPick, DraftInfo, DraftPickDetail } from '../types/sleeper';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class SleeperAPI {
  private static readonly BASE_URL = 'https://api.sleeper.app/v1';

  static async getUser(username: string): Promise<SleeperUser> {
    const response = await fetch(`${this.BASE_URL}/user/${username}`);
    await sleep(100);
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  }

  static async getUserLeagues(userId: string, season: string): Promise<any[]> {
    const response = await fetch(`${this.BASE_URL}/user/${userId}/leagues/nfl/${season}`);
    await sleep(100);
    if (!response.ok) throw new Error('Failed to fetch leagues');
    return response.json();
  }

  static async getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
    const response = await fetch(`${this.BASE_URL}/league/${leagueId}/rosters`);
    await sleep(100);
    if (!response.ok) throw new Error('Failed to fetch rosters');
    return response.json();
  }

  static async getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
    const response = await fetch(`${this.BASE_URL}/league/${leagueId}/users`);
    await sleep(100);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  }

  static async getLeague(leagueId: string): Promise<any> {
    const response = await fetch(`${this.BASE_URL}/league/${leagueId}`);
    await sleep(100);
    if (!response.ok) throw new Error('Failed to fetch league');
    return response.json();
  }

  static async getPlayers(): Promise<Record<string, PlayerInfo>> {
    const response = await fetch(`${this.BASE_URL}/players/nfl`);
    await sleep(100);
    if (!response.ok) throw new Error('Failed to fetch players');
    return response.json();
  }

  static async getTransactions(leagueId: string, week: number): Promise<SleeperTrade[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/league/${leagueId}/transactions/${week}`);
      await sleep(100);
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions for week ${week}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Error fetching transactions for week ${week}:`, error);
      throw new Error('Failed to fetch');
    }
  }

  static async getAllTransactions(leagueId: string): Promise<SleeperTrade[]> {
    const allTransactions: SleeperTrade[] = [];
    
    for (let week = 1; week <= 18; week++) {
      try {
        const weekTransactions = await this.getTransactions(leagueId, week);
        allTransactions.push(...weekTransactions);
      } catch (error) {
        console.error(`Error fetching transactions for week ${week}:`, error);
      }
    }
    
    return allTransactions;
  }

  static async getAllTrades(leagueId: string): Promise<SleeperTrade[]> {
    const transactions = await this.getAllTransactions(leagueId);
    return transactions.filter(t => t.type === 'trade');
  }

  static async getLeagueDrafts(leagueId: string): Promise<DraftInfo[]> {
    const response = await fetch(`${this.BASE_URL}/league/${leagueId}/drafts`);
    await sleep(100);
    if (!response.ok) throw new Error('Failed to fetch drafts');
    return response.json();
  }

  static async getDraftPicks(draftId: string): Promise<DraftPickDetail[]> {
    const response = await fetch(`${this.BASE_URL}/draft/${draftId}/picks`);
    await sleep(100);
    if (!response.ok) throw new Error('Failed to fetch draft picks');
    return response.json();
  }
}