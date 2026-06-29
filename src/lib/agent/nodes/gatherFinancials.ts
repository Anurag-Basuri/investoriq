// Agent Node: Gather financial data from multiple sources
import { ResearchState, FinancialData } from "../state";
import {
  getQuoteData,
  getFundamentals,
  getHistoricalPrices,
  getQuarterlyRevenue,
} from "../../datasources/yahooFinance";
import { getCompanyOverview } from "../../datasources/alphaVantage";

export async function gatherFinancialsNode(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  const startTime = new Date().toISOString();
  const ticker = state.tickerSymbol;

  if (!ticker) {
    return {
      financialData: null,
      errors: ["Cannot gather financials: no ticker symbol"],
      agentLog: [
        {
          agent: "Financial Data",
          action: "Skipped",
          detail: "No ticker symbol available",
          timestamp: startTime,
          status: "error" as const,
        },
      ],
    };
  }

  try {
    // Fetch from multiple sources in parallel
    const [quoteData, fundamentals, historicalPrices, quarterlyRevenue, alphaOverview] =
      await Promise.allSettled([
        getQuoteData(ticker),
        getFundamentals(ticker),
        getHistoricalPrices(ticker, 12),
        getQuarterlyRevenue(ticker),
        getCompanyOverview(ticker.replace(".NS", "").replace(".BSE", "")),
      ]);

    const quote = quoteData.status === "fulfilled" ? quoteData.value : null;
    const fundData = fundamentals.status === "fulfilled" ? fundamentals.value : null;
    const history = historicalPrices.status === "fulfilled" ? historicalPrices.value : [];
    const qRevenue = quarterlyRevenue.status === "fulfilled" ? quarterlyRevenue.value : [];
    const alpha = alphaOverview.status === "fulfilled" ? alphaOverview.value : null;

    // Track data sources used
    const sourcesUsed: string[] = [];
    if (quote) sourcesUsed.push("Yahoo Finance Quotes");
    if (fundData) sourcesUsed.push("Yahoo Finance Fundamentals");
    if (history.length > 0) sourcesUsed.push("Yahoo Finance Historical");
    if (alpha) sourcesUsed.push("Alpha Vantage");

    // Merge data from multiple sources (Yahoo primary, Alpha fallback)
    const financialData: FinancialData = {
      currency: quote?.currency || "USD",
      currentPrice: quote?.currentPrice || 0,
      priceChange: {
        amount: quote?.priceChange || 0,
        percent: quote?.priceChangePercent || 0,
      },
      marketCap: quote?.marketCap || alpha?.marketCap || 0,
      peRatio: quote?.peRatio || alpha?.peRatio || 0,
      forwardPE: quote?.forwardPE || 0,
      revenueGrowth: fundData?.revenueGrowth || (alpha?.quarterlyRevenueGrowthYOY ? alpha.quarterlyRevenueGrowthYOY * 100 : 0),
      profitMargin: fundData?.profitMargin || (alpha?.profitMargin ? alpha.profitMargin * 100 : 0),
      operatingMargin: fundData?.operatingMargin || (alpha?.operatingMarginTTM ? alpha.operatingMarginTTM * 100 : 0),
      roe: fundData?.roe || (alpha?.returnOnEquityTTM ? alpha.returnOnEquityTTM * 100 : 0),
      debtToEquity: fundData?.debtToEquity || 0,
      currentRatio: fundData?.currentRatio || 0,
      dividendYield: quote?.dividendYield || alpha?.dividendYield || 0,
      beta: quote?.beta || alpha?.beta || 0,
      fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh || alpha?.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: quote?.fiftyTwoWeekLow || alpha?.fiftyTwoWeekLow || 0,
      historicalPrices: history,
      quarterlyRevenue: qRevenue,
      sector: fundData?.sector || alpha?.sector || "N/A",
      industry: fundData?.industry || alpha?.industry || "N/A",
      summary: fundData?.summary || alpha?.description || "No summary available.",
      employees: fundData?.employees || 0,
      website: fundData?.website || "",
    };

    const metricsCollected = Object.entries(financialData).filter(
      ([, v]) => v !== 0 && v !== "N/A" && v !== "" && v !== null && (!Array.isArray(v) || v.length > 0)
    ).length;

    return {
      financialData,
      agentLog: [
        {
          agent: "Financial Data",
          action: "Data collected",
          detail: `${metricsCollected} metrics from ${sourcesUsed.length} sources (${sourcesUsed.join(", ")})`,
          timestamp: startTime,
          status: "complete" as const,
        },
      ],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return {
      financialData: null,
      errors: [`Financial data gathering failed: ${errorMsg}`],
      agentLog: [
        {
          agent: "Financial Data",
          action: "Failed",
          detail: errorMsg,
          timestamp: startTime,
          status: "error" as const,
        },
      ],
    };
  }
}
