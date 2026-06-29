// LangGraph Agent Graph — Compiles the multi-agent research pipeline
import { StateGraph, END } from "@langchain/langgraph";
import { ResearchStateAnnotation, ResearchState } from "./state";
import { resolveTickerNode } from "./nodes/resolveTicker";
import { gatherFinancialsNode } from "./nodes/gatherFinancials";
import { analyzeNewsNode } from "./nodes/analyzeNews";
import { analyzeCompetitionNode } from "./nodes/analyzeCompetition";
import { assessRiskNode } from "./nodes/assessRisk";
import { generateVerdictNode } from "./nodes/generateVerdict";

// Conditional edge: check if ticker resolution succeeded
function shouldContinueAfterTicker(state: ResearchState): string {
  if (state.tickerSymbol && state.tickerSymbol.length > 0) {
    return "gatherFinancials";
  }
  return "__end__";
}

// Build the research agent graph
function buildResearchGraph() {
  const graph = new StateGraph(ResearchStateAnnotation)
    // Add all nodes
    .addNode("resolveTicker", resolveTickerNode)
    .addNode("gatherFinancials", gatherFinancialsNode)
    .addNode("analyzeNews", analyzeNewsNode)
    .addNode("analyzeCompetition", analyzeCompetitionNode)
    .addNode("assessRisk", assessRiskNode)
    .addNode("generateVerdict", generateVerdictNode)

    // Define edges
    .addEdge("__start__", "resolveTicker")
    .addConditionalEdges("resolveTicker", shouldContinueAfterTicker, {
      gatherFinancials: "gatherFinancials",
      __end__: END,
    })
    .addEdge("gatherFinancials", "analyzeNews")
    .addEdge("analyzeNews", "analyzeCompetition")
    .addEdge("analyzeCompetition", "assessRisk")
    .addEdge("assessRisk", "generateVerdict")
    .addEdge("generateVerdict", END);

  return graph.compile();
}

// Singleton compiled graph
let compiledGraph: ReturnType<typeof buildResearchGraph> | null = null;

export function getResearchGraph() {
  if (!compiledGraph) {
    compiledGraph = buildResearchGraph();
  }
  return compiledGraph;
}

// Run the full research pipeline
export async function runResearch(companyName: string): Promise<ResearchState> {
  const graph = getResearchGraph();

  const initialState = {
    companyName,
    tickerSymbol: "",
    exchange: "",
    companyFullName: companyName,
    financialData: null,
    newsData: null,
    competitiveData: null,
    riskData: null,
    decision: null,
    agentLog: [],
    errors: [],
  };

  const result = await graph.invoke(initialState);
  return result as ResearchState;
}
