// Agent Node: Risk assessment
import { ResearchState, RiskData } from "../state";
import { RISK_ASSESSMENT_PROMPT } from "../prompts";
import { invokeLLM, parseLLMJson } from "../../utils/llm";

export async function assessRiskNode(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  const startTime = new Date().toISOString();

  try {
    const financialSummary = state.financialData
      ? `Price: $${state.financialData.currentPrice}, ` +
        `Market Cap: $${(state.financialData.marketCap / 1e9).toFixed(1)}B, ` +
        `P/E: ${state.financialData.peRatio.toFixed(1)}, ` +
        `Revenue Growth: ${state.financialData.revenueGrowth.toFixed(1)}%, ` +
        `Profit Margin: ${state.financialData.profitMargin.toFixed(1)}%, ` +
        `ROE: ${state.financialData.roe.toFixed(1)}%, ` +
        `Debt/Equity: ${state.financialData.debtToEquity.toFixed(2)}, ` +
        `Current Ratio: ${state.financialData.currentRatio.toFixed(2)}, ` +
        `Beta: ${state.financialData.beta.toFixed(2)}, ` +
        `52W Range: $${state.financialData.fiftyTwoWeekLow} - $${state.financialData.fiftyTwoWeekHigh}`
      : "Financial data not available";

    const prompt = RISK_ASSESSMENT_PROMPT
      .replace("{companyName}", state.companyFullName)
      .replace("{tickerSymbol}", state.tickerSymbol)
      .replace("{financialSummary}", financialSummary)
      .replace(
        "{sentimentLabel}",
        state.newsData?.sentimentLabel || "Unknown"
      )
      .replace(
        "{overallSentiment}",
        state.newsData?.overallSentiment?.toFixed(2) || "0"
      )
      .replace(
        "{newsThemes}",
        state.newsData?.keyThemes?.join(", ") || "No themes"
      )
      .replace(
        "{marketPosition}",
        state.competitiveData?.marketPosition || "Unknown"
      );

    let analysis: {
      riskScore?: number;
      riskLevel?: string;
      risks?: Array<{ category: string; description: string; severity: string }>;
      mitigants?: string[];
    };

    try {
      const responseText = await invokeLLM(prompt, { temperature: 0.2 });
      analysis = parseLLMJson(responseText);
    } catch {
      console.warn("LLM risk assessment failed, using defaults");
      analysis = {
        riskScore: 5,
        riskLevel: "Medium",
        risks: [{ category: "Analysis", description: "Risk assessment could not be completed — LLM unavailable", severity: "Medium" }],
        mitigants: ["Retry analysis when LLM quota is available"],
      };
    }

    const riskData: RiskData = {
      riskScore: analysis.riskScore || 5,
      riskLevel: (analysis.riskLevel as RiskData["riskLevel"]) || "Medium",
      risks: (analysis.risks || []).map(
        (r) => ({
          category: r.category,
          description: r.description,
          severity: r.severity as "Low" | "Medium" | "High" | "Critical",
        })
      ),
      mitigants: analysis.mitigants || [],
    };

    return {
      riskData,
      agentLog: [
        {
          agent: "Risk Assessment",
          action: "Assessment complete",
          detail: `Risk Score: ${riskData.riskScore}/10 (${riskData.riskLevel}). Identified ${riskData.risks.length} risks and ${riskData.mitigants.length} mitigants.`,
          timestamp: startTime,
          status: "complete" as const,
        },
      ],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return {
      riskData: {
        riskScore: 5,
        riskLevel: "Medium",
        risks: [],
        mitigants: [],
      },
      errors: [`Risk assessment failed: ${errorMsg}`],
      agentLog: [
        {
          agent: "Risk Assessment",
          action: "Failed",
          detail: errorMsg,
          timestamp: startTime,
          status: "error" as const,
        },
      ],
    };
  }
}
