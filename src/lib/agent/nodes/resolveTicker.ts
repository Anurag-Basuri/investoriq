// Agent Node: Resolve company name to ticker symbol
// This node can work WITHOUT the LLM if Yahoo Finance search returns clear results
import { ResearchState } from "../state";
import { searchTicker } from "../../datasources/yahooFinance";
import { TICKER_RESOLUTION_PROMPT } from "../prompts";
import { invokeLLM, parseLLMJson } from "../../utils/llm";

export async function resolveTickerNode(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  const startTime = new Date().toISOString();

  try {
    // Step 1: Search Yahoo Finance for the company
    let searchResults = await searchTicker(state.companyName);

    if (searchResults.length === 0) {
      // Fallback: Try variations
      const variations = [
        `${state.companyName} Inc`,
        `${state.companyName} Ltd`,
        `${state.companyName} Corporation`,
        `${state.companyName} Company`,
      ];

      for (const variation of variations) {
        const results = await searchTicker(variation);
        if (results.length > 0) {
          searchResults = results;
          break;
        }
      }
    }

    // Step 2: Try LLM-assisted resolution, but fall back to best Yahoo result
    try {
      const prompt = TICKER_RESOLUTION_PROMPT
        .replace("{companyName}", state.companyName)
        .replace("{searchResults}", JSON.stringify(searchResults, null, 2));

      const responseText = await invokeLLM(prompt, { temperature: 0 });
      const parsed = parseLLMJson<{
        tickerSymbol: string;
        exchange: string;
        companyFullName: string;
        confidence?: number;
      }>(responseText);

      return {
        tickerSymbol: parsed.tickerSymbol,
        exchange: parsed.exchange,
        companyFullName: parsed.companyFullName,
        agentLog: [
          {
            agent: "Ticker Resolution",
            action: "Identified ticker",
            detail: `${parsed.companyFullName} → ${parsed.tickerSymbol} (${parsed.exchange}) [Confidence: ${((parsed.confidence || 0.9) * 100).toFixed(0)}%]`,
            timestamp: startTime,
            status: "complete" as const,
          },
        ],
      };
    } catch (llmError) {
      // LLM failed — fall back to best Yahoo Finance search result
      console.warn("LLM ticker resolution failed, using Yahoo Finance fallback:", llmError);

      if (searchResults.length > 0) {
        const best = searchResults.find(r => r.type === "EQUITY") || searchResults[0];

        return {
          tickerSymbol: best.symbol,
          exchange: best.exchange,
          companyFullName: best.name || state.companyName,
          agentLog: [
            {
              agent: "Ticker Resolution",
              action: "Identified ticker (fallback)",
              detail: `${best.name || state.companyName} → ${best.symbol} (${best.exchange}) [Yahoo Finance direct match]`,
              timestamp: startTime,
              status: "complete" as const,
            },
          ],
        };
      }

      throw llmError;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return {
      tickerSymbol: "",
      exchange: "",
      companyFullName: state.companyName,
      errors: [`Ticker resolution failed: ${errorMsg}`],
      agentLog: [
        {
          agent: "Ticker Resolution",
          action: "Failed",
          detail: errorMsg,
          timestamp: startTime,
          status: "error" as const,
        },
      ],
    };
  }
}
