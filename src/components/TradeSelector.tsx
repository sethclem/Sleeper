import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, Users, ArrowRight } from 'lucide-react';
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
  const [expandedTrades, setExpandedTrades] = useState<Set<string>>(new Set());

  const getUserById = (userId: string) => {
    return users.find(user => user.user_id === userId);
  };

  const getPlayerName = (playerId: string) => {
    return players[playerId]?.full_name || `Player ${playerId}`;
  };

  const formatTradeDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const toggleTradeExpansion = (tradeId: string) => {
    const newExpanded = new Set(expandedTrades);
    if (newExpanded.has(tradeId)) {
      newExpanded.delete(tradeId);
    } else {
      newExpanded.add(tradeId);
    }
    setExpandedTrades(newExpanded);
  };

  const handleTradeToggle = (tradeId: string) => {
    const newSelected = selectedTrades.includes(tradeId)
      ? selectedTrades.filter(id => id !== tradeId)
      : [...selectedTrades, tradeId];
    onSelectionChange(newSelected);
  };

  const getTradeParticipants = (trade: SleeperTrade) => {
    const participants = new Set<string>();
    
    // Add users from adds/drops
    Object.values(trade.adds || {}).forEach(rosterId => {
      const user = users.find(u => u.user_id === trade.roster_ids.find(rid => rid === rosterId)?.toString());
      if (user) participants.add(user.user_id);
    });
    
    // Add creator and consenters
    participants.add(trade.creator);
    trade.consenter_ids?.forEach(id => {
      const user = users.find(u => u.user_id === id.toString());
      if (user) participants.add(user.user_id);
    });

    return Array.from(participants).map(userId => getUserById(userId)).filter(Boolean);
  };

  const getTradeDetails = (trade: SleeperTrade) => {
    const details: { [userId: string]: { received: string[], gave: string[] } } = {};
    
    // Process adds (what each team received)
    Object.entries(trade.adds || {}).forEach(([playerId, rosterId]) => {
      const user = users.find(u => u.user_id === trade.roster_ids.find(rid => rid === rosterId)?.toString());
      if (user) {
        if (!details[user.user_id]) details[user.user_id] = { received: [], gave: [] };
        details[user.user_id].received.push(getPlayerName(playerId));
      }
    });

    // Process drops (what each team gave up)
    Object.entries(trade.drops || {}).forEach(([playerId, rosterId]) => {
      const user = users.find(u => u.user_id === trade.roster_ids.find(rid => rid === rosterId)?.toString());
      if (user) {
        if (!details[user.user_id]) details[user.user_id] = { received: [], gave: [] };
        details[user.user_id].gave.push(getPlayerName(playerId));
      }
    });

    return details;
  };

  return (
    <div className="space-y-3">
      {trades.map((trade) => {
        const isSelected = selectedTrades.includes(trade.transaction_id);
        const isExpanded = expandedTrades.has(trade.transaction_id);
        const participants = getTradeParticipants(trade);
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
                        {participants.map(p => p?.display_name || p?.username).join(' ↔ ')}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleTradeExpansion(trade.transaction_id)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Trade Details</h4>
                  <div className="space-y-3">
                    {Object.entries(tradeDetails).map(([userId, details]) => {
                      const user = getUserById(userId);
                      if (!user) return null;
                      
                      return (
                        <div key={userId} className="bg-gray-50 rounded-lg p-3">
                          <div className="font-medium text-gray-900 mb-2">
                            {user.display_name || user.username}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {details.received.length > 0 && (
                              <div>
                                <span className="text-green-600 font-medium">Received:</span>
                                <ul className="mt-1 space-y-1">
                                  {details.received.map((player, idx) => (
                                    <li key={idx} className="text-gray-700">• {player}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {details.gave.length > 0 && (
                              <div>
                                <span className="text-red-600 font-medium">Gave:</span>
                                <ul className="mt-1 space-y-1">
                                  {details.gave.map((player, idx) => (
                                    <li key={idx} className="text-gray-700">• {player}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};