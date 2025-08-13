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
}

import { SleeperTrade, SleeperUser, SleeperRoster, PlayerInfo, DraftPick, DraftInfo, DraftPickDetail, ConsolidatedLeague } from '../types/sleeper';