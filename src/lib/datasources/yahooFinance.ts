// Yahoo Finance data source wrapper
import yahooFinance from "yahoo-finance2";

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

export async function searchTicker(query: string): Promise<Array<{ symbol: string; name: string; exchange: string; type: string }>> {
  try {
    const results = await yahooFinance.search(query, { newsCount: 0 });
    return (results.quotes || [])
      .filter((q: Record<string, unknown>) => q.isYahooFinance !== false)
      .slice(0, 5)
      .map((q: Record<string, unknown>) => ({
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
    const quote = await yahooFinance.quote(ticker);
    return {
      currentPrice: quote.regularMarketPrice || 0,
      previousClose: quote.regularMarketPreviousClose || 0,
      priceChange: quote.regularMarketChange || 0,
      priceChangePercent: quote.regularMarketChangePercent || 0,
      marketCap: quote.marketCap || 0,
      peRatio: quote.trailingPE || 0,
      forwardPE: quote.forwardPE || 0,
      dividendYield: quote.dividendYield || 0,
      beta: quote.beta || 0,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
      volume: quote.regularMarketVolume || 0,
      averageVolume: quote.averageDailyVolume3Month || 0,
    };
  } catch (error) {
    console.error("Yahoo Finance quote error:", error);
    return null;
  }
}

export async function getFundamentals(ticker: string): Promise<YahooFundamentals | null> {
  try {
    const result = await yahooFinance.quoteSummary(ticker, {
      modules: [
        "assetProfile",
        "financialData",
        "defaultKeyStatistics",
        "incomeStatementHistory",
      ],
    });

    const profile = result.assetProfile;
    const financial = result.financialData;
    const keyStats = result.defaultKeyStatistics;

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
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const result = await yahooFinance.historical(ticker, {
      period1: startDate.toISOString().split("T")[0],
      period2: endDate.toISOString().split("T")[0],
      interval: "1mo",
    });

    return result.map((item) => ({
      date: item.date.toISOString().split("T")[0],
      close: item.close || 0,
    }));
  } catch (error) {
    console.error("Yahoo Finance historical error:", error);
    return [];
  }
}

export async function getQuarterlyRevenue(ticker: string): Promise<Array<{ quarter: string; revenue: number }>> {
  try {
    const result = await yahooFinance.quoteSummary(ticker, {
      modules: ["incomeStatementHistoryQuarterly"],
    });

    const statements = result.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];
    return statements
      .slice(0, 8)
      .reverse()
      .map((s) => {
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
    const result = await yahooFinance.recommendationsBySymbol(ticker);
    // Try to get related tickers from recommendations
    if (result && result.recommendedSymbols) {
      return result.recommendedSymbols.slice(0, 5).map((s) => ({
        symbol: s.symbol,
        name: s.symbol, // Will be enriched later
      }));
    }
    return [];
  } catch (error) {
    console.error("Yahoo Finance peer comparison error:", error);
    return [];
  }
}
