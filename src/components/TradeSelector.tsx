import React, { useState } from 'react';
import { Calendar, Users, ArrowRight } from 'lucide-react';
import { SleeperTrade, SleeperUser, PlayerInfo } from '../types/sleeper';

interface TradeSelectorProps {
  trades: SleeperTrade[];
  users: SleeperUser[];
  players: Record<string, PlayerInfo>;
  selectedTrades: string[];
  onSelectionChange: (tradeIds: string[]) => void;
}

export const TradeSelector: React.FC<TradeSelectorProps> = ({
  trades,
  users,
  players,
  selectedTrades,
  onSelectionChange
}) => {
  const getUserById = (userId: string) => {
    return users.find(user => user.user_id === userId);
  };

  const getPlayerName = (playerId: string) => {
    const player = players[playerId];
    if (!player) return `Player ${playerId}`;
    return `${player.full_name} (${player.position})`;
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
        sent
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
                        {details.received.length > 0 && (
                          <div>
                            <span className="text-green-600 font-medium">Receives:</span>
                            <div className="ml-2 mt-1">
                              {details.received.map((player, idx) => (
                                <div key={idx} className="text-gray-700">• {player}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        {details.sent.length > 0 && (
                          <div>
                            <span className="text-red-600 font-medium">Sends:</span>
                            <div className="ml-2 mt-1">
                              {details.sent.map((player, idx) => (
                                <div key={idx} className="text-gray-700">• {player}</div>
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