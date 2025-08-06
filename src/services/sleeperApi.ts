import { SleeperUser, SleeperLeague, SleeperRoster, SleeperMatchup, SleeperTransaction } from '../types/sleeper';

const BASE_URL = 'https://api.sleeper.app/v1';

export class SleeperAPI {
  static async getUser(username: string): Promise<SleeperUser | null> {
    try {
      const response = await fetch(`${BASE_URL}/user/${username}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  static async getUserLeagues(userId: string, season: string = '2024'): Promise<SleeperLeague[]> {
    try {
      const response = await fetch(`${BASE_URL}/user/${userId}/leagues/nfl/${season}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching leagues:', error);
      return [];
    }
  }

  static async getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
    try {
      const response = await fetch(`${BASE_URL}/league/${leagueId}/rosters`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching rosters:', error);
      return [];
    }
  }

  static async getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
    try {
      const response = await fetch(`${BASE_URL}/league/${leagueId}/users`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching league users:', error);
      return [];
    }
  }

  static async getMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]> {
    try {
      const response = await fetch(`${BASE_URL}/league/${leagueId}/matchups/${week}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching matchups:', error);
      return [];
    }
  }

  static async getTransactions(leagueId: string, week: number): Promise<SleeperTransaction[]> {
    try {
      const response = await fetch(`${BASE_URL}/league/${leagueId}/transactions/${week}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  static async getNFLState(): Promise<{ week: number; season: string }> {
    try {
      const response = await fetch(`${BASE_URL}/state/nfl`);
      if (!response.ok) return { week: 1, season: '2024' };
      const data = await response.json();
      return { week: data.week, season: data.season };
    } catch (error) {
      console.error('Error fetching NFL state:', error);
      return { week: 1, season: '2024' };
    }
  }
}