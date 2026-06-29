// Agent Node: Generate final investment verdict and memo
import { ResearchState, InvestmentDecision } from "../state";
import { INVESTMENT_VERDICT_PROMPT } from "../prompts";
import { invokeLLM, parseLLMJson } from "../../utils/llm";

export async function generateVerdictNode(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  const startTime = new Date().toISOString();

  try {
    const fd = state.financialData;
    const nd = state.newsData;
    const cd = state.competitiveData;
    const rd = state.riskData;

    const prompt = INVESTMENT_VERDICT_PROMPT
      .replace("{companyName}", state.companyFullName)
      .replace("{tickerSymbol}", state.tickerSymbol)
      .replace("${currentPrice}", fd?.currentPrice?.toFixed(2) || "N/A")
      .replace(
        "${marketCap}",
        fd?.marketCap
          ? fd.marketCap >= 1e12
            ? `${(fd.marketCap / 1e12).toFixed(2)}T`
            : `${(fd.marketCap / 1e9).toFixed(2)}B`
          : "N/A"
      )
      .replace("{peRatio}", fd?.peRatio?.toFixed(1) || "N/A")
      .replace("{revenueGrowth}", fd?.revenueGrowth?.toFixed(1) || "N/A")
      .replace("{profitMargin}", fd?.profitMargin?.toFixed(1) || "N/A")
      .replace("{operatingMargin}", fd?.operatingMargin?.toFixed(1) || "N/A")
      .replace("{roe}", fd?.roe?.toFixed(1) || "N/A")
      .replace("{debtToEquity}", fd?.debtToEquity?.toFixed(2) || "N/A")
      .replace("{currentRatio}", fd?.currentRatio?.toFixed(2) || "N/A")
      .replace("{beta}", fd?.beta?.toFixed(2) || "N/A")
      .replace(
        "${fiftyTwoWeekLow}",
        fd?.fiftyTwoWeekLow?.toFixed(2) || "N/A"
      )
      .replace(
        "${fiftyTwoWeekHigh}",
        fd?.fiftyTwoWeekHigh?.toFixed(2) || "N/A"
      )
      .replace("{sector}", fd?.sector || "N/A")
      .replace("{industry}", fd?.industry || "N/A")
      .replace("{sentimentLabel}", nd?.sentimentLabel || "Unknown")
      .replace(
        "{overallSentiment}",
        nd?.overallSentiment?.toFixed(2) || "0"
      )
      .replace(
        "{newsThemes}",
        nd?.keyThemes?.join(", ") || "No themes available"
      )
      .replace("{marketPosition}", cd?.marketPosition || "Unknown")
      .replace("{moatRating}", cd?.moatRating || "Unknown")
      .replace("{industryOutlook}", cd?.industryOutlook || "Unknown")
      .replace("{riskScore}", rd?.riskScore?.toString() || "5")
      .replace("{riskLevel}", rd?.riskLevel || "Medium")
      .replace(
        "{topRisks}",
        rd?.risks
          ?.slice(0, 3)
          .map((r) => `${r.category}: ${r.description}`)
          .join("; ") || "No specific risks identified"
      );

    const responseText = await invokeLLM(prompt, { temperature: 0.3 });
    const verdictData = parseLLMJson<{
      verdict?: string;
      confidenceScore?: number;
      oneLiner?: string;
      investmentMemo?: string;
      keyBullPoints?: string[];
      keyBearPoints?: string[];
      targetPriceRange?: { low: number; high: number };
      timeHorizon?: string;
    }>(responseText);

    const decision: InvestmentDecision = {
      verdict: (verdictData.verdict as InvestmentDecision["verdict"]) || "Hold",
      confidenceScore: verdictData.confidenceScore || 50,
      oneLiner: verdictData.oneLiner || "Analysis inconclusive.",
      investmentMemo:
        verdictData.investmentMemo || "Investment memo generation failed.",
      keyBullPoints: verdictData.keyBullPoints || [],
      keyBearPoints: verdictData.keyBearPoints || [],
      targetPriceRange: verdictData.targetPriceRange || { low: 0, high: 0 },
      timeHorizon: verdictData.timeHorizon || "12 months",
    };

    return {
      decision,
      agentLog: [
        {
          agent: "Investment Decision",
          action: "Verdict generated",
          detail: `${decision.verdict} (Confidence: ${decision.confidenceScore}/100). Target: $${decision.targetPriceRange.low}-$${decision.targetPriceRange.high}`,
          timestamp: startTime,
          status: "complete" as const,
        },
      ],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return {
      decision: {
        verdict: "Hold",
        confidenceScore: 0,
        oneLiner: "Analysis could not be completed due to an error.",
        investmentMemo: `Error generating verdict: ${errorMsg}`,
        keyBullPoints: [],
        keyBearPoints: [],
        targetPriceRange: { low: 0, high: 0 },
        timeHorizon: "N/A",
      },
      errors: [`Verdict generation failed: ${errorMsg}`],
      agentLog: [
        {
          agent: "Investment Decision",
          action: "Failed",
          detail: errorMsg,
          timestamp: startTime,
          status: "error" as const,
        },
      ],
    };
  }
}
