// Currency exchange rate cache and API configuration
let cachedRate: number | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const FALLBACK_RATE = 115; // Fallback rate if API fails

// Free currency exchange API endpoints
const CURRENCY_APIS = [
  'https://api.exchangerate-api.com/v4/latest/EUR',
  'https://api.exchangerate.host/latest?base=EUR&symbols=BDT',
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json'
];

// Fetch real-time EUR to BDT exchange rate
export const fetchExchangeRate = async (): Promise<number> => {
  // Return cached rate if still valid
  if (cachedRate && (Date.now() - lastFetchTime) < CACHE_DURATION) {
    return cachedRate;
  }

  for (const apiUrl of CURRENCY_APIS) {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) continue;

      const data = await response.json();

      // Handle different API response formats
      let rate: number | undefined;
      if (apiUrl.includes('exchangerate-api.com')) {
        rate = data.rates?.BDT;
      } else if (apiUrl.includes('exchangerate.host')) {
        rate = data.rates?.BDT;
      } else if (apiUrl.includes('fawazahmed0')) {
        rate = data.eur?.bdt;
      }

      if (rate && typeof rate === 'number' && rate > 0) {
        cachedRate = rate;
        lastFetchTime = Date.now();
        return rate;
      }
    } catch (error) {
      console.warn(`Failed to fetch from ${apiUrl}:`, error);
      continue;
    }
  }

  // If all APIs fail, use fallback rate
  console.warn('All currency APIs failed, using fallback rate');
  return FALLBACK_RATE;
};

export const convertEuroToTaka = async (euroAmount: number): Promise<number> => {
  const rate = await fetchExchangeRate();
  return Math.round(euroAmount * rate);
};

// Synchronous version with cached rate for immediate display
export const convertEuroToTakaCached = (euroAmount: number): number => {
  const rate = cachedRate || FALLBACK_RATE;
  return Math.round(euroAmount * rate);
};

export interface FormatCurrencyOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  showSymbol?: boolean;
}

export const formatCurrency = (
  amount: number,
  currency: 'EUR' | 'BDT',
  options?: FormatCurrencyOptions
): string => {
  const {
    minimumFractionDigits = currency === 'EUR' ? 2 : 0,
    maximumFractionDigits = currency === 'EUR' ? 2 : 0,
    showSymbol = true
  } = options || {};

  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  if (currency === 'EUR') {
    return showSymbol ? `€${formattedAmount}` : formattedAmount;
  } else {
    return showSymbol ? `৳${formattedAmount}` : formattedAmount;
  }
};

export const formatDualCurrency = async (euroAmount: number): Promise<string> => {
  const takaAmount = await convertEuroToTaka(euroAmount);
  return `${formatCurrency(euroAmount, 'EUR')} / ${formatCurrency(takaAmount, 'BDT')}`;
};

// Synchronous version for immediate display
export const formatDualCurrencyCached = (euroAmount: number): string => {
  const takaAmount = convertEuroToTakaCached(euroAmount);
  return `${formatCurrency(euroAmount, 'EUR')} / ${formatCurrency(takaAmount, 'BDT')}`;
};

// Initialize exchange rate on module load
fetchExchangeRate().catch(() => {
  console.warn('Initial exchange rate fetch failed, using fallback rate');
});
