// Agent Node: Competitive landscape analysis
import { ResearchState, CompetitiveData, Competitor } from "../state";
import { getQuoteData, getPeerComparison } from "../../datasources/yahooFinance";
import { COMPETITIVE_ANALYSIS_PROMPT } from "../prompts";
import { invokeLLM, parseLLMJson } from "../../utils/llm";

export async function analyzeCompetitionNode(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  const startTime = new Date().toISOString();

  try {
    // Get peer companies from Yahoo Finance
    const peers = await getPeerComparison(state.tickerSymbol);

    // Fetch basic data for each peer (in parallel, with error handling per-peer)
    const peerDataResults = await Promise.allSettled(
      peers.slice(0, 5).map(async (peer) => {
        const quote = await getQuoteData(peer.symbol);
        return {
          name: peer.name || peer.symbol,
          ticker: peer.symbol,
          marketCap: quote?.marketCap || 0,
          peRatio: quote?.peRatio || 0,
          revenueGrowth: 0,
        };
      })
    );

    const competitors: Competitor[] = peerDataResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<Competitor>).value)
      .filter((c) => c.marketCap > 0);

    // Use LLM for competitive analysis
    const financialSummary = state.financialData
      ? `Market Cap: $${(state.financialData.marketCap / 1e9).toFixed(1)}B, ` +
        `P/E: ${state.financialData.peRatio.toFixed(1)}, ` +
        `Revenue Growth: ${state.financialData.revenueGrowth.toFixed(1)}%, ` +
        `Profit Margin: ${state.financialData.profitMargin.toFixed(1)}%, ` +
        `Sector: ${state.financialData.sector}, ` +
        `Industry: ${state.financialData.industry}`
      : "Financial data not available";

    const competitorData = competitors.length > 0
      ? competitors
          .map(
            (c) =>
              `${c.name} (${c.ticker}): Market Cap $${(c.marketCap / 1e9).toFixed(1)}B, P/E ${c.peRatio.toFixed(1)}`
          )
          .join("\n")
      : "No peer data available — use your knowledge of the industry";

    const newsContext = state.newsData
      ? `Sentiment: ${state.newsData.sentimentLabel}. Key themes: ${state.newsData.keyThemes.join(", ")}`
      : "No news data available";

    const prompt = COMPETITIVE_ANALYSIS_PROMPT
      .replace("{companyName}", state.companyFullName)
      .replace("{tickerSymbol}", state.tickerSymbol)
      .replace("{industry}", state.financialData?.industry || "Unknown")
      .replace("{financialSummary}", financialSummary)
      .replace("{competitorData}", competitorData)
      .replace("{newsContext}", newsContext);

    let analysis: {
      competitiveAdvantages?: string[];
      competitiveDisadvantages?: string[];
      marketPosition?: string;
      marketShare?: string;
      industryOutlook?: string;
      moatRating?: string;
    };

    try {
      const responseText = await invokeLLM(prompt, { temperature: 0.2 });
      analysis = parseLLMJson(responseText);
    } catch {
      console.warn("LLM competitive analysis failed, using defaults");
      analysis = {
        competitiveAdvantages: ["Data unavailable — LLM rate limited"],
        competitiveDisadvantages: ["Data unavailable — LLM rate limited"],
        marketPosition: "Unable to analyze — LLM unavailable",
        marketShare: "Unknown",
        industryOutlook: "Unknown",
        moatRating: "None",
      };
    }

    const competitiveData: CompetitiveData = {
      competitors,
      competitiveAdvantages: analysis.competitiveAdvantages || [],
      competitiveDisadvantages: analysis.competitiveDisadvantages || [],
      marketPosition: analysis.marketPosition || "Unknown",
      marketShare: analysis.marketShare || "Unknown",
      industryOutlook: analysis.industryOutlook || "Unknown",
      moatRating: (analysis.moatRating as CompetitiveData["moatRating"]) || "None",
    };

    return {
      competitiveData,
      agentLog: [
        {
          agent: "Competitive Analysis",
          action: "Analysis complete",
          detail: `Mapped ${competitors.length} competitors. Moat: ${competitiveData.moatRating}. ${competitiveData.competitiveAdvantages.length} advantages identified.`,
          timestamp: startTime,
          status: "complete" as const,
        },
      ],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return {
      competitiveData: {
        competitors: [],
        competitiveAdvantages: [],
        competitiveDisadvantages: [],
        marketPosition: "Unable to analyze",
        marketShare: "Unknown",
        industryOutlook: "Unknown",
        moatRating: "None",
      },
      errors: [`Competitive analysis failed: ${errorMsg}`],
      agentLog: [
        {
          agent: "Competitive Analysis",
          action: "Failed",
          detail: errorMsg,
          timestamp: startTime,
          status: "error" as const,
        },
      ],
    };
  }
}
