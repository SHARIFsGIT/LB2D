import { useState, useEffect } from 'react';
import { fetchExchangeRate, convertEuroToTakaCached, formatCurrency } from '../utils/currency';

export const useCurrency = () => {
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExchangeRate = async () => {
      try {
        setLoading(true);
        const rate = await fetchExchangeRate();
        setExchangeRate(rate);
        setError(null);
      } catch (err) {
        setError('Failed to fetch exchange rate');
        console.error('Currency exchange rate error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadExchangeRate();
  }, []);

  const convertEuroToTaka = (euroAmount: number): number => {
    return convertEuroToTakaCached(euroAmount);
  };

  const formatDualCurrency = (euroAmount: number): string => {
    const takaAmount = convertEuroToTaka(euroAmount);
    return `${formatCurrency(euroAmount, 'EUR')} / ${formatCurrency(takaAmount, 'BDT')}`;
  };

  return {
    exchangeRate,
    loading,
    error,
    convertEuroToTaka,
    formatDualCurrency,
    formatCurrency
  };
};