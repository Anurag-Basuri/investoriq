// LangGraph State Schema for InvestorIQ Research Agent
import { Annotation } from "@langchain/langgraph";

// Sub-interfaces for structured data
export interface PriceChange {
  amount: number;
  percent: number;
}

export interface HistoricalPrice {
  date: string;
  close: number;
}

export interface QuarterlyRevenue {
  quarter: string;
  revenue: number;
}

export interface FinancialData {
  currentPrice: number;
  priceChange: PriceChange;
  marketCap: number;
  peRatio: number;
  forwardPE: number;
  revenueGrowth: number;
  profitMargin: number;
  operatingMargin: number;
  roe: number;
  debtToEquity: number;
  currentRatio: number;
  dividendYield: number;
  beta: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  historicalPrices: HistoricalPrice[];
  quarterlyRevenue: QuarterlyRevenue[];
  sector: string;
  industry: string;
  summary: string;
  employees: number;
  website: string;
}

export interface NewsArticle {
  title: string;
  source: string;
  date: string;
  url: string;
  snippet: string;
  sentiment: number; // -1 to 1
}

export interface NewsData {
  articles: NewsArticle[];
  overallSentiment: number;
  sentimentLabel: "Very Bearish" | "Bearish" | "Neutral" | "Bullish" | "Very Bullish";
  keyThemes: string[];
  sourceBreakdown: { source: string; count: number }[];
}

export interface Competitor {
  name: string;
  ticker: string;
  marketCap: number;
  peRatio: number;
  revenueGrowth: number;
}

export interface CompetitiveData {
  competitors: Competitor[];
  competitiveAdvantages: string[];
  competitiveDisadvantages: string[];
  marketPosition: string;
  marketShare: string;
  industryOutlook: string;
  moatRating: "None" | "Narrow" | "Wide";
}

export interface RiskItem {
  category: string;
  description: string;
  severity: "Low" | "Medium" | "High" | "Critical";
}

export interface RiskData {
  riskScore: number; // 1-10
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  risks: RiskItem[];
  mitigants: string[];
}

export interface InvestmentDecision {
  verdict: "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell";
  confidenceScore: number; // 0-100
  oneLiner: string;
  investmentMemo: string;
  keyBullPoints: string[];
  keyBearPoints: string[];
  targetPriceRange: { low: number; high: number };
  timeHorizon: string;
}

export interface AgentLogEntry {
  agent: string;
  action: string;
  detail: string;
  timestamp: string;
  status: "complete" | "in_progress" | "error";
}

// LangGraph State Annotation
export const ResearchStateAnnotation = Annotation.Root({
  // Input
  companyName: Annotation<string>(),

  // Stage 1: Ticker Resolution
  tickerSymbol: Annotation<string>(),
  exchange: Annotation<string>(),
  companyFullName: Annotation<string>(),

  // Stage 2: Financial Data
  financialData: Annotation<FinancialData | null>(),

  // Stage 3: News & Sentiment
  newsData: Annotation<NewsData | null>(),

  // Stage 4: Competitive Analysis
  competitiveData: Annotation<CompetitiveData | null>(),

  // Stage 5: Risk Assessment
  riskData: Annotation<RiskData | null>(),

  // Stage 6: Investment Decision
  decision: Annotation<InvestmentDecision | null>(),

  // Agent Activity Log
  agentLog: Annotation<AgentLogEntry[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  // Error Handling
  errors: Annotation<string[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

export type ResearchState = typeof ResearchStateAnnotation.State;
