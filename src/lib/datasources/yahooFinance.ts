// Yahoo Finance data source wrapper
// Using 'any' for return types as yahoo-finance2 has complex internal types
// that vary between versions. We handle this safely with optional chaining.

export interface YahooQuoteData {
  currentPrice: number;
  previousClose: number;
  priceChange: number;
  priceChangePercent: number;
  marketCap: number;
  peRatio: number;
  forwardPE: number;
  dividendYield: number;
  beta: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  averageVolume: number;
}

export interface YahooFundamentals {
  sector: string;
  industry: string;
  summary: string;
  employees: number;
  website: string;
  revenueGrowth: number;
  profitMargin: number;
  operatingMargin: number;
  roe: number;
  debtToEquity: number;
  currentRatio: number;
  totalRevenue: number;
  netIncome: number;
}

export interface YahooHistoricalPrice {
  date: string;
  close: number;
}

// yahoo-finance2 v3 requires instantiation with `new`
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require("yahoo-finance2").default;

// Singleton instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let yfInstance: any = null;

function getYahooFinance() {
  if (!yfInstance) {
    yfInstance = new YahooFinanceClass({ suppressNotices: ["yahooSurvey"] });
  }
  return yfInstance;
}

export async function searchTicker(query: string): Promise<Array<{ symbol: string; name: string; exchange: string; type: string }>> {
  try {
    const yf = getYahooFinance();
    const results = await yf.search(query, { newsCount: 0 });
    const quotes = (results as { quotes?: Array<Record<string, unknown>> })?.quotes || [];
    return quotes
      .filter((q) => q.isYahooFinance !== false)
      .slice(0, 5)
      .map((q) => ({
        symbol: (q.symbol as string) || "",
        name: (q.shortname as string) || (q.longname as string) || "",
        exchange: (q.exchange as string) || "",
        type: (q.quoteType as string) || "",
      }));
  } catch (error) {
    console.error("Yahoo Finance search error:", error);
    return [];
  }
}

export async function getQuoteData(ticker: string): Promise<YahooQuoteData | null> {
  try {
    const yf = getYahooFinance();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yf.quote(ticker);
    return {
      currentPrice: quote?.regularMarketPrice || 0,
      previousClose: quote?.regularMarketPreviousClose || 0,
      priceChange: quote?.regularMarketChange || 0,
      priceChangePercent: quote?.regularMarketChangePercent || 0,
      marketCap: quote?.marketCap || 0,
      peRatio: quote?.trailingPE || 0,
      forwardPE: quote?.forwardPE || 0,
      dividendYield: quote?.dividendYield || 0,
      beta: quote?.beta || 0,
      fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: quote?.fiftyTwoWeekLow || 0,
      volume: quote?.regularMarketVolume || 0,
      averageVolume: quote?.averageDailyVolume3Month || 0,
    };
  } catch (error) {
    console.error("Yahoo Finance quote error:", error);
    return null;
  }
}

export async function getFundamentals(ticker: string): Promise<YahooFundamentals | null> {
  try {
    const yf = getYahooFinance();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yf.quoteSummary(ticker, {
      modules: [
        "assetProfile",
        "financialData",
        "defaultKeyStatistics",
        "incomeStatementHistory",
      ],
    });

    const profile = result?.assetProfile;
    const financial = result?.financialData;
    const keyStats = result?.defaultKeyStatistics;

    return {
      sector: profile?.sector || "N/A",
      industry: profile?.industry || "N/A",
      summary: profile?.longBusinessSummary || "No summary available.",
      employees: profile?.fullTimeEmployees || 0,
      website: profile?.website || "",
      revenueGrowth: (financial?.revenueGrowth || 0) * 100,
      profitMargin: (financial?.profitMargins || 0) * 100,
      operatingMargin: (financial?.operatingMargins || 0) * 100,
      roe: (financial?.returnOnEquity || 0) * 100,
      debtToEquity: financial?.debtToEquity || 0,
      currentRatio: financial?.currentRatio || 0,
      totalRevenue: financial?.totalRevenue || 0,
      netIncome: keyStats?.netIncomeToCommon || 0,
    };
  } catch (error) {
    console.error("Yahoo Finance fundamentals error:", error);
    return null;
  }
}

export async function getHistoricalPrices(
  ticker: string,
  months: number = 12
): Promise<YahooHistoricalPrice[]> {
  try {
    const yf = getYahooFinance();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any[] = await yf.historical(ticker, {
      period1: startDate.toISOString().split("T")[0],
      period2: endDate.toISOString().split("T")[0],
      interval: "1mo",
    });

    return (result || []).map((item: { date: Date; close?: number }) => ({
      date: item.date instanceof Date ? item.date.toISOString().split("T")[0] : String(item.date),
      close: item.close || 0,
    }));
  } catch (error) {
    console.error("Yahoo Finance historical error:", error);
    return [];
  }
}

export async function getQuarterlyRevenue(ticker: string): Promise<Array<{ quarter: string; revenue: number }>> {
  try {
    const yf = getYahooFinance();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yf.quoteSummary(ticker, {
      modules: ["incomeStatementHistoryQuarterly"],
    });

    const statements = result?.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return statements
      .slice(0, 8)
      .reverse()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s: any) => {
        const date = s.endDate ? new Date(s.endDate) : new Date();
        const q = Math.ceil((date.getMonth() + 1) / 3);
        return {
          quarter: `Q${q} ${date.getFullYear()}`,
          revenue: s.totalRevenue || 0,
        };
      });
  } catch (error) {
    console.error("Yahoo Finance quarterly revenue error:", error);
    return [];
  }
}

export async function getPeerComparison(ticker: string): Promise<Array<{ symbol: string; name: string }>> {
  try {
    const yf = getYahooFinance();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yf.recommendationsBySymbol(ticker);
    if (result?.recommendedSymbols) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.recommendedSymbols.slice(0, 5).map((s: any) => ({
        symbol: s.symbol,
        name: s.symbol,
      }));
    }
    return [];
  } catch (error) {
    console.error("Yahoo Finance peer comparison error:", error);
    return [];
  }
}
