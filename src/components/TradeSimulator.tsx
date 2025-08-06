import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { SleeperLeague, SleeperRoster, SleeperUser, SleeperTrade, TradeSimulationResult, PlayerInfo } from '../types/sleeper';
import { SleeperAPI } from '../services/sleeperApi';
import { TradeSelector } from './TradeSelector';
import { SimulationResults } from './SimulationResults';
import { TradeSimulationEngine } from '../services/tradeSimulationEngine';

interface TradeSimulatorProps {
  league: SleeperLeague;
  rosters: SleeperRoster[];
  users: SleeperUser[];
}

export const TradeSimulator: React.FC<TradeSimulatorProps> = ({ league, rosters, users }) => {
  const [trades, setTrades] = useState<SleeperTrade[]>([]);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [simulationResult, setSimulationResult] = useState<TradeSimulationResult | null>(null);
  const [players, setPlayers] = useState<Record<string, PlayerInfo>>({});
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    loadTradeData();
  }, [league.league_id]);

  const loadTradeData = async () => {
    setLoading(true);
    try {
      const [tradesData, playersData] = await Promise.all([
        SleeperAPI.getAllTrades(league.league_id),
        SleeperAPI.getPlayers()
      ]);
      
      setTrades(tradesData);
      setPlayers(playersData);
    } catch (error) {
      console.error('Error loading trade data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTradeSelection = (tradeIds: string[]) => {
    setSelectedTrades(tradeIds);
  };

  const runSimulation = async () => {
    if (selectedTrades.length === 0) return;
    
    setSimulating(true);
    try {
      const selectedTradeObjects = trades.filter(trade => selectedTrades.includes(trade.transaction_id));
      const engine = new TradeSimulationEngine(league, rosters, users, players);
      const result = await engine.simulateUndoTrades(selectedTradeObjects);
      setSimulationResult(result);
    } catch (error) {
      console.error('Error running simulation:', error);
    } finally {
      setSimulating(false);
    }
  };

  const clearSimulation = () => {
    setSelectedTrades([]);
    setSimulationResult(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sleeper-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trade data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
          <ArrowRightLeft className="w-8 h-8 mr-3 text-sleeper-primary" />
          Trade Simulator
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Explore alternate timelines by undoing trades. See how your league standings and weekly matchups 
          would have changed if certain trades never happened.
        </p>
      </div>

      {trades.length === 0 ? (
        <div className="card p-12 text-center">
          <ArrowRightLeft className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Trades Found</h3>
          <p className="text-gray-600">
            This league hasn't completed any trades yet this season.
          </p>
        </div>
      ) : (
        <>
          {/* Trade Selection */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Select Trades to Undo</h3>
              <p className="text-sm text-gray-600 mt-1">
                Choose one or more trades to simulate what would have happened if they never occurred.
              </p>
            </div>
            <div className="p-6">
              <TradeSelector
                trades={trades}
                users={users}
                rosters={rosters}
                players={players}
                selectedTrades={selectedTrades}
                onSelectionChange={handleTradeSelection}
                leagueId={league.league_id}
                league={league}
              />
              
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  {selectedTrades.length} trade{selectedTrades.length !== 1 ? 's' : ''} selected
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={clearSimulation}
                    disabled={selectedTrades.length === 0 && !simulationResult}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                  <button
                    onClick={runSimulation}
                    disabled={selectedTrades.length === 0 || simulating}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {simulating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Simulating...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Run Simulation
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Simulation Results */}
          {simulationResult && (
            <SimulationResults
              result={simulationResult}
              selectedTradeCount={selectedTrades.length}
            />
          )}
        </>
      )}
    </div>
  );
};