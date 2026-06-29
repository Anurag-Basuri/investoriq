// Alpha Vantage API wrapper — secondary financial data source
const ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query";

export interface AlphaVantageOverview {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  marketCap: number;
  peRatio: number;
  pegRatio: number;
  bookValue: number;
  dividendPerShare: number;
  dividendYield: number;
  eps: number;
  revenuePerShareTTM: number;
  profitMargin: number;
  operatingMarginTTM: number;
  returnOnAssetsTTM: number;
  returnOnEquityTTM: number;
  revenueTTM: number;
  quarterlyRevenueGrowthYOY: number;
  quarterlyEarningsGrowthYOY: number;
  analystTargetPrice: number;
  beta: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

export interface AlphaVantageIncomeStatement {
  fiscalDateEnding: string;
  totalRevenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  ebitda: number;
}

function getApiKey(): string {
  return process.env.ALPHA_VANTAGE_API_KEY || "";
}

export async function getCompanyOverview(symbol: string): Promise<AlphaVantageOverview | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Alpha Vantage API key not configured — skipping");
    return null;
  }

  try {
    const url = `${ALPHA_VANTAGE_BASE}?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data["Note"] || data["Information"] || !data["Symbol"]) {
      console.warn("Alpha Vantage rate limited or no data:", data["Note"] || data["Information"]);
      return null;
    }

    return {
      symbol: data["Symbol"] || symbol,
      name: data["Name"] || "",
      description: data["Description"] || "",
      sector: data["Sector"] || "",
      industry: data["Industry"] || "",
      marketCap: parseFloat(data["MarketCapitalization"]) || 0,
      peRatio: parseFloat(data["PERatio"]) || 0,
      pegRatio: parseFloat(data["PEGRatio"]) || 0,
      bookValue: parseFloat(data["BookValue"]) || 0,
      dividendPerShare: parseFloat(data["DividendPerShare"]) || 0,
      dividendYield: parseFloat(data["DividendYield"]) || 0,
      eps: parseFloat(data["EPS"]) || 0,
      revenuePerShareTTM: parseFloat(data["RevenuePerShareTTM"]) || 0,
      profitMargin: parseFloat(data["ProfitMargin"]) || 0,
      operatingMarginTTM: parseFloat(data["OperatingMarginTTM"]) || 0,
      returnOnAssetsTTM: parseFloat(data["ReturnOnAssetsTTM"]) || 0,
      returnOnEquityTTM: parseFloat(data["ReturnOnEquityTTM"]) || 0,
      revenueTTM: parseFloat(data["RevenueTTM"]) || 0,
      quarterlyRevenueGrowthYOY: parseFloat(data["QuarterlyRevenueGrowthYOY"]) || 0,
      quarterlyEarningsGrowthYOY: parseFloat(data["QuarterlyEarningsGrowthYOY"]) || 0,
      analystTargetPrice: parseFloat(data["AnalystTargetPrice"]) || 0,
      beta: parseFloat(data["Beta"]) || 0,
      fiftyTwoWeekHigh: parseFloat(data["52WeekHigh"]) || 0,
      fiftyTwoWeekLow: parseFloat(data["52WeekLow"]) || 0,
    };
  } catch (error) {
    console.error("Alpha Vantage overview error:", error);
    return null;
  }
}

export async function getIncomeStatements(symbol: string): Promise<AlphaVantageIncomeStatement[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const url = `${ALPHA_VANTAGE_BASE}?function=INCOME_STATEMENT&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data["Note"] || data["Information"] || !data["quarterlyReports"]) {
      return [];
    }

    return (data["quarterlyReports"] || []).slice(0, 8).map((report: Record<string, string>) => ({
      fiscalDateEnding: report["fiscalDateEnding"] || "",
      totalRevenue: parseFloat(report["totalRevenue"]) || 0,
      grossProfit: parseFloat(report["grossProfit"]) || 0,
      operatingIncome: parseFloat(report["operatingIncome"]) || 0,
      netIncome: parseFloat(report["netIncome"]) || 0,
      ebitda: parseFloat(report["ebitda"]) || 0,
    }));
  } catch (error) {
    console.error("Alpha Vantage income statement error:", error);
    return [];
  }
}
