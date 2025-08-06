import React from 'react';
import { Activity, Plus, Minus, ArrowRightLeft } from 'lucide-react';
import { SleeperTransaction, SleeperUser } from '../types/sleeper';

interface RecentActivityProps {
  transactions: SleeperTransaction[];
  users: SleeperUser[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ transactions, users }) => {
  const getUserById = (userId: string) => {
    return users.find(user => user.user_id === userId);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'waiver':
        return <Plus className="w-4 h-4" />;
      case 'free_agent':
        return <Plus className="w-4 h-4" />;
      case 'trade':
        return <ArrowRightLeft className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'waiver':
        return 'text-blue-600 bg-blue-100';
      case 'free_agent':
        return 'text-green-600 bg-green-100';
      case 'trade':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'waiver':
        return 'Waiver Claim';
      case 'free_agent':
        return 'Free Agent';
      case 'trade':
        return 'Trade';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const recentTransactions = transactions
    .filter(t => t.status === 'complete')
    .sort((a, b) => b.status_updated - a.status_updated)
    .slice(0, 10);

  return (
    <div className="card">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-sleeper-primary" />
          Recent Activity
        </h2>
      </div>
      <div className="p-6">
        {recentTransactions.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No recent transactions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentTransactions.map((transaction) => {
              const user = getUserById(transaction.creator);
              const transactionColor = getTransactionColor(transaction.type);
              
              return (
                <div key={transaction.transaction_id} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${transactionColor}`}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {formatTransactionType(transaction.type)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(transaction.status_updated)}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      {user?.display_name || user?.username || 'Unknown User'}
                    </p>
                    {transaction.settings?.waiver_bid && (
                      <p className="text-xs text-gray-500">
                        Waiver bid: ${transaction.settings.waiver_bid}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};