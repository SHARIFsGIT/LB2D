import React from 'react';
import { useCurrency } from '../hooks/useCurrency';
import { fetchExchangeRate } from '../utils/currency';

const CurrencyStatus: React.FC = () => {
  const { exchangeRate, loading, error } = useCurrency();

  const handleRefreshRate = async () => {
    try {
      await fetchExchangeRate();
      window.location.reload(); // Simple refresh to update all components
    } catch (err) {
      console.error('Failed to refresh exchange rate:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        <div className="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-blue-500 mr-2"></div>
        Loading exchange rate...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center text-sm text-red-500">
        <span className="mr-2">⚠️ Using fallback rate</span>
        <button 
          onClick={handleRefreshRate}
          className="text-blue-500 hover:text-blue-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center text-sm text-green-600">
      <span className="mr-2">💱 1€ = ৳{exchangeRate?.toFixed(2)}</span>
      <button 
        onClick={handleRefreshRate}
        className="text-blue-500 hover:text-blue-700 text-xs"
        title="Refresh exchange rate"
      >
        🔄
      </button>
    </div>
  );
};

export default CurrencyStatus;