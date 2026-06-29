"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Sparkles,
  Brain,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Newspaper,
  Swords,
  ShieldAlert,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Activity,
  Users,
  Shield,
  ExternalLink,
  HelpCircle,
  Info,
} from "lucide-react";
import type { ResearchState } from "@/lib/agent/state";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDate,
  formatTime,
  getVerdictColor,
  getSentimentColor,
  getRiskColor,
} from "@/lib/utils/formatters";
import styles from "./page.module.css";

type TabKey = "financials" | "news" | "competition" | "risk" | "memo";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "financials", label: "Financial Analysis", icon: BarChart3 },
  { key: "news", label: "News & Sentiment", icon: Newspaper },
  { key: "competition", label: "Competitive Analysis", icon: Swords },
  { key: "risk", label: "Risk Assessment", icon: ShieldAlert },
  { key: "memo", label: "Full Memo", icon: FileText },
];

/* ===== METRIC TOOLTIPS ===== */
interface MetricTooltipInfo {
  title: string;
  description: string;
  getHealth: (value: number) => "good" | "neutral" | "bad";
  getInterpretation: (value: number) => string;
}

const METRIC_TOOLTIPS: Record<string, MetricTooltipInfo> = {
  "Market Cap": {
    title: "Market Capitalization",
    description: "Total market value of the company's outstanding shares. Large-cap (>$10B) companies tend to be more stable; small-cap (<$2B) can be more volatile but offer higher growth potential.",
    getHealth: (v) => (v >= 10e9 ? "good" : v >= 2e9 ? "neutral" : "bad"),
    getInterpretation: (v) =>
      v >= 200e9 ? "Mega-cap · Very stable" : v >= 10e9 ? "Large-cap · Stable" : v >= 2e9 ? "Mid-cap · Moderate risk" : "Small-cap · Higher risk",
  },
  "Revenue Growth": {
    title: "Year-over-Year Revenue Growth",
    description: "How much the company's revenue has grown compared to the same period last year. Sustained growth above 15% is generally considered strong.",
    getHealth: (v) => (v >= 10 ? "good" : v >= 0 ? "neutral" : "bad"),
    getInterpretation: (v) =>
      v >= 20 ? "Rapid growth" : v >= 10 ? "Healthy growth" : v >= 0 ? "Flat / slow growth" : "Revenue is declining",
  },
  "Profit Margin": {
    title: "Net Profit Margin",
    description: "Percentage of revenue that becomes profit after all expenses. Shows how efficiently the company converts sales into actual earnings.",
    getHealth: (v) => (v >= 15 ? "good" : v >= 0 ? "neutral" : "bad"),
    getInterpretation: (v) =>
      v >= 20 ? "Excellent profitability" : v >= 10 ? "Good margins" : v >= 0 ? "Thin margins" : "Losing money",
  },
  "P/E Ratio": {
    title: "Price-to-Earnings Ratio",
    description: "How much investors pay per dollar of earnings. A high P/E may mean overvaluation or high growth expectations. A low P/E could signal undervaluation or concerns.",
    getHealth: (v) => (v > 0 && v <= 25 ? "good" : v > 25 && v <= 35 ? "neutral" : "bad"),
    getInterpretation: (v) =>
      v <= 0 ? "Negative earnings" : v <= 15 ? "Undervalued / value stock" : v <= 25 ? "Fairly valued" : v <= 40 ? "Premium valuation" : "Very expensive",
  },
  ROE: {
    title: "Return on Equity",
    description: "How well the company uses shareholder money to generate profits. Measures management efficiency — higher is better.",
    getHealth: (v) => (v >= 15 ? "good" : v >= 8 ? "neutral" : "bad"),
    getInterpretation: (v) =>
      v >= 20 ? "Excellent returns" : v >= 15 ? "Strong efficiency" : v >= 8 ? "Adequate" : "Poor capital efficiency",
  },
  "Operating Margin": {
    title: "Operating Profit Margin",
    description: "Revenue remaining after operating costs (before interest and taxes). Indicates core business profitability without financial engineering.",
    getHealth: (v) => (v >= 15 ? "good" : v >= 5 ? "neutral" : "bad"),
    getInterpretation: (v) =>
      v >= 25 ? "Exceptional operations" : v >= 15 ? "Healthy operations" : v >= 5 ? "Moderate" : "Weak operations",
  },
  "Debt / Equity": {
    title: "Debt-to-Equity Ratio",
    description: "How much debt the company uses compared to shareholder equity. Lower is generally safer. Above 2.0 signals heavy leverage.",
    getHealth: (v) => (v <= 0.5 ? "good" : v <= 1.5 ? "neutral" : "bad"),
    getInterpretation: (v) =>
      v <= 0.3 ? "Very conservative" : v <= 1.0 ? "Balanced" : v <= 2.0 ? "Moderate leverage" : "Highly leveraged",
  },
  "Current Ratio": {
    title: "Current Ratio",
    description: "Can the company pay its short-term bills? Compares current assets to current liabilities. Below 1.0 means it may struggle to meet obligations.",
    getHealth: (v) => (v >= 1.5 ? "good" : v >= 1.0 ? "neutral" : "bad"),
    getInterpretation: (v) =>
      v >= 2.0 ? "Strong liquidity" : v >= 1.5 ? "Healthy" : v >= 1.0 ? "Adequate but tight" : "Liquidity risk",
  },
  Beta: {
    title: "Beta (Volatility)",
    description: "Measures how much the stock moves relative to the overall market. Beta of 1.0 = moves with the market. Above 1.5 = significantly more volatile.",
    getHealth: (v) => (v >= 0.8 && v <= 1.2 ? "good" : v <= 1.5 ? "neutral" : "bad"),
    getInterpretation: (v) =>
      v < 0.5 ? "Very low volatility" : v <= 1.0 ? "Less volatile than market" : v <= 1.5 ? "Moderately volatile" : "Highly volatile",
  },
  "Dividend Yield": {
    title: "Dividend Yield",
    description: "Annual dividends as a percentage of the stock price. Income investors look for 2%+. Very high yields (>8%) may signal risk.",
    getHealth: (v) => (v >= 1.5 && v <= 6 ? "good" : v > 0 ? "neutral" : "neutral"),
    getInterpretation: (v) =>
      v <= 0 ? "No dividend" : v < 2 ? "Low yield" : v <= 4 ? "Good income stock" : v <= 7 ? "High yield" : "Unusually high — check sustainability",
  },
  "52 Week High": {
    title: "52-Week High",
    description: "The highest price this stock has traded at in the past year. Comparing to the current price shows if the stock is near its peak or has pulled back.",
    getHealth: () => "neutral",
    getInterpretation: () => "Reference point for recent range",
  },
  "52 Week Low": {
    title: "52-Week Low",
    description: "The lowest price this stock has traded at in the past year. Useful to gauge how much downside the stock has already experienced.",
    getHealth: () => "neutral",
    getInterpretation: () => "Reference point for recent range",
  },
};

function getMetricRawValue(label: string, data: NonNullable<ResearchState["financialData"]>): number {
  switch (label) {
    case "Market Cap": return data.marketCap;
    case "Revenue Growth": return data.revenueGrowth;
    case "Profit Margin": return data.profitMargin;
    case "P/E Ratio": return data.peRatio;
    case "ROE": return data.roe;
    case "Operating Margin": return data.operatingMargin;
    case "Debt / Equity": return data.debtToEquity;
    case "Current Ratio": return data.currentRatio;
    case "Beta": return data.beta;
    case "Dividend Yield": return data.dividendYield;
    case "52 Week High": return data.fiftyTwoWeekHigh;
    case "52 Week Low": return data.fiftyTwoWeekLow;
    default: return 0;
  }
}

/* ===== TOOLTIP COMPONENT ===== */
function MetricTooltip({ label, value, children }: { label: string; value: number; children: React.ReactNode }) {
  const info = METRIC_TOOLTIPS[label];
  if (!info) return <>{children}</>;

  const health = info.getHealth(value);
  const interpretation = info.getInterpretation(value);

  return (
    <div className={styles.tooltipWrapper}>
      {children}
      <HelpCircle size={12} className={styles.helpIcon} />
      <div className={styles.tooltipContent}>
        <div className={styles.tooltipTitle}>
          <Info size={12} /> {info.title}
        </div>
        <div className={styles.tooltipBody}>{info.description}</div>
        <div className={styles.tooltipInterpretation} data-health={health}>
          <span className={styles.healthDot} data-health={health} />
          {interpretation}
        </div>
      </div>
    </div>
  );
}

function ResearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const companyName = searchParams.get("company") || "";

  const [data, setData] = useState<ResearchState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("financials");
  const [currentStep, setCurrentStep] = useState(0);

  const STEPS = [
    "Resolving ticker symbol...",
    "Gathering financial data from Yahoo Finance & Alpha Vantage...",
    "Analyzing news from Google News & Reddit...",
    "Mapping competitive landscape...",
    "Assessing investment risks...",
    "Generating investment verdict...",
  ];

  useEffect(() => {
    if (!companyName) {
      router.push("/");
      return;
    }

    // Simulate step progress during loading
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 5000);

    const fetchData = async () => {
      try {
        const response = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyName }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Research failed");
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
        clearInterval(stepInterval);
      }
    };

    fetchData();

    return () => clearInterval(stepInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyName]);

  if (loading) {
    return (
      <main className={styles.main}>
        <nav className={styles.navbar}>
          <div className={`container ${styles.navContent}`}>
            <div className={styles.logo}>
              <div className={styles.logoIcon}><Sparkles size={22} /></div>
              <span className={styles.logoText}>InvestorIQ</span>
            </div>
          </div>
        </nav>

        <div className={styles.loadingContainer}>
          <div className={styles.loadingContent}>
            <div className={styles.loadingSpinner}>
              <Brain size={32} />
            </div>
            <h2 className={styles.loadingTitle}>
              Analyzing {companyName}...
            </h2>
            <p className={styles.loadingSubtitle}>
              Our AI agents are researching across multiple data sources
            </p>

            <div className={styles.pipeline}>
              {STEPS.map((step, i) => (
                <div
                  key={i}
                  className={`${styles.pipelineStep} ${
                    i < currentStep
                      ? styles.stepComplete
                      : i === currentStep
                      ? styles.stepActive
                      : styles.stepPending
                  }`}
                >
                  <div className={styles.stepIndicator}>
                    {i < currentStep ? (
                      <CheckCircle2 size={18} />
                    ) : i === currentStep ? (
                      <div className={styles.stepPulse} />
                    ) : (
                      <div className={styles.stepDot} />
                    )}
                  </div>
                  <span className={styles.stepText}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    const isRateLimit = error.toLowerCase().includes("429") || 
                        error.toLowerCase().includes("rate limit") || 
                        error.toLowerCase().includes("quota") || 
                        error.toLowerCase().includes("too many requests");

    return (
      <main className={styles.main}>
        <nav className={styles.navbar}>
          <div className={`container ${styles.navContent}`}>
            <div className={styles.logo}>
              <div className={styles.logoIcon}><Sparkles size={22} /></div>
              <span className={styles.logoText}>InvestorIQ</span>
            </div>
          </div>
        </nav>
        <div className={styles.errorContainer}>
          {isRateLimit ? (
            <AlertCircle size={48} style={{ color: "#f59e0b", marginBottom: "1rem" }} />
          ) : (
            <XCircle size={48} className={styles.errorIcon} />
          )}
          
          <h2>{isRateLimit ? "AI Rate Limit Reached" : "Research Failed"}</h2>
          
          {isRateLimit ? (
            <div className={styles.errorDetails}>
              <p>We've temporarily hit the usage limits for our AI models. This usually resets in a few minutes.</p>
              <div className={styles.errorSubDetails}>
                <strong>Technical details:</strong> {error}
              </div>
            </div>
          ) : (
            <p>{error}</p>
          )}
          
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            {isRateLimit ? (
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                <Clock size={18} style={{ marginRight: '8px' }} /> Try Again Now
              </button>
            ) : null}
            <button className={isRateLimit ? "btn btn-secondary" : "btn btn-primary"} onClick={() => router.push("/")}>
              <ArrowLeft size={18} /> {isRateLimit ? "New Search" : "Try Again"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const fd = data.financialData;
  const nd = data.newsData;
  const cd = data.competitiveData;
  const rd = data.riskData;
  const decision = data.decision;
  const isPositiveChange = (fd?.priceChange?.percent || 0) >= 0;

  return (
    <main className={styles.main}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={`container ${styles.navContent}`}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}><Sparkles size={22} /></div>
            <span className={styles.logoText}>InvestorIQ</span>
          </div>
          <button className="btn btn-secondary" onClick={() => router.push("/")}>
            <ArrowLeft size={16} /> New Research
          </button>
        </div>
      </nav>

      <div className={styles.dashboard}>
        <div className="container">
          {/* Company Header */}
          <header className={`${styles.companyHeader} animate-fade-in-up`}>
            <div className={styles.companyInfo}>
              <h1 className={styles.companyName}>{data.companyFullName}</h1>
              <div className={styles.companyMeta}>
                <span className="pill pill-primary">{data.tickerSymbol}</span>
                <span className="pill pill-neutral">{data.exchange}</span>
                {fd?.sector && fd.sector !== "N/A" && (
                  <span className={styles.sectorLabel}>
                    {fd.sector} › {fd.industry}
                  </span>
                )}
              </div>
            </div>
            {fd && (
              <div className={styles.priceBlock}>
                <span className={`${styles.currentPrice} mono`}>
                  {formatCurrency(fd.currentPrice, fd.currency)}
                </span>
                <span
                  className={`${styles.priceChange} mono`}
                  style={{
                    color: isPositiveChange
                      ? "var(--color-primary)"
                      : "var(--color-danger)",
                  }}
                >
                  {isPositiveChange ? (
                    <ArrowUpRight size={16} />
                  ) : (
                    <ArrowDownRight size={16} />
                  )}
                  {formatCurrency(Math.abs(fd.priceChange.amount), fd.currency)} (
                  {formatPercent(fd.priceChange.percent)})
                </span>
              </div>
            )}
          </header>

          {/* Verdict Banner */}
          {decision && (
            <div
              className={`${styles.verdictBanner} gradient-border-card animate-fade-in-up delay-1`}
            >
              <div className={styles.verdictTop}>
                <div className={styles.verdictLeft}>
                  <span
                    className={styles.verdictLabel}
                    style={{ color: getVerdictColor(decision.verdict) }}
                  >
                    {decision.verdict.toUpperCase()}
                  </span>
                  <div className={styles.tooltipWrapper}>
                    <span className={styles.verdictConfidence}>
                      Confidence: {decision.confidenceScore}/100
                    </span>
                    <HelpCircle size={12} className={styles.helpIcon} />
                    <div className={styles.tooltipContent}>
                      <div className={styles.tooltipTitle}>
                        <Info size={12} /> Confidence Score
                      </div>
                      <div className={styles.tooltipBody}>
                        How confident the AI is in its verdict, from 0 (no confidence) to 100 (extremely confident). Based on data quality, consistency across sources, and strength of financial signals.
                      </div>
                      <div className={styles.tooltipInterpretation} data-health={decision.confidenceScore >= 70 ? "good" : decision.confidenceScore >= 40 ? "neutral" : "bad"}>
                        <span className={styles.healthDot} data-health={decision.confidenceScore >= 70 ? "good" : decision.confidenceScore >= 40 ? "neutral" : "bad"} />
                        {decision.confidenceScore >= 80 ? "Very high confidence" : decision.confidenceScore >= 60 ? "Moderate confidence" : decision.confidenceScore >= 40 ? "Low confidence — more research recommended" : "Very low — treat with caution"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.verdictScore}>
                  <span
                    className={styles.scoreNumber}
                    style={{ color: getVerdictColor(decision.verdict) }}
                  >
                    {decision.confidenceScore}
                  </span>
                  <span className={styles.scoreMax}>/100</span>
                </div>
              </div>
              <p className={styles.verdictSummary}>{decision.oneLiner}</p>
              <div className="confidence-meter">
                <div
                  className="confidence-meter-fill"
                  style={{ width: `${decision.confidenceScore}%` }}
                />
              </div>
            </div>
          )}

          {/* Main Content: Tabs + Agent Log */}
          <div className={`${styles.mainGrid} animate-fade-in-up delay-2`}>
            {/* Tabs Panel */}
            <div className={styles.tabsPanel}>
              <div className="tabs">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    className={`tab ${activeTab === tab.key ? "active" : ""}`}
                    onClick={() => setActiveTab(tab.key)}
                    id={`tab-${tab.key}`}
                  >
                    <tab.icon
                      size={16}
                      style={{ marginRight: "0.375rem", verticalAlign: "middle" }}
                    />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className={styles.tabContent}>
                {activeTab === "financials" && fd && (
                  <FinancialsTab data={fd} />
                )}
                {activeTab === "news" && nd && <NewsTab data={nd} />}
                {activeTab === "competition" && cd && (
                  <CompetitionTab data={cd} currency={fd?.currency} />
                )}
                {activeTab === "risk" && rd && <RiskTab data={rd} />}
                {activeTab === "memo" && decision && (
                  <MemoTab decision={decision} currency={fd?.currency || "USD"} />
                )}
              </div>
            </div>

            {/* Agent Activity Log */}
            <aside className={styles.agentLog}>
              <h4 className={styles.agentLogTitle}>
                <Activity size={16} /> Agent Activity
              </h4>
              <div className={styles.agentTimeline}>
                {data.agentLog.map((entry, i) => (
                  <div key={i} className={styles.timelineEntry}>
                    <div
                      className={styles.timelineDot}
                      data-status={entry.status}
                    />
                    <div className={styles.timelineContent}>
                      <span className={styles.timelineAgent}>
                        {entry.agent}
                      </span>
                      <span className={styles.timelineDetail}>
                        {entry.detail}
                      </span>
                      <span className={styles.timelineTime}>
                        {formatTime(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {data.errors.length > 0 && (
                <div className={styles.errorLog}>
                  <h5>
                    <AlertCircle size={14} /> Warnings
                  </h5>
                  {data.errors.map((err, i) => (
                    <p key={i} className={styles.errorEntry}>
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ===== TAB COMPONENTS ===== */

function FinancialsTab({
  data,
}: {
  data: NonNullable<ResearchState["financialData"]>;
}) {
  const metrics = [
    {
      label: "Market Cap",
      value: formatCurrency(data.marketCap, data.currency, true),
      icon: DollarSign,
    },
    {
      label: "Revenue Growth",
      value: formatPercent(data.revenueGrowth),
      icon: TrendingUp,
      color:
        data.revenueGrowth >= 0
          ? "var(--color-primary)"
          : "var(--color-danger)",
    },
    {
      label: "Profit Margin",
      value: formatPercent(data.profitMargin),
      icon: BarChart3,
      color:
        data.profitMargin >= 15
          ? "var(--color-primary)"
          : data.profitMargin >= 0
          ? "var(--color-tertiary)"
          : "var(--color-danger)",
    },
    {
      label: "P/E Ratio",
      value: data.peRatio > 0 ? data.peRatio.toFixed(1) : "N/A",
      icon: Target,
      sub:
        data.peRatio > 30
          ? "High"
          : data.peRatio > 15
          ? "Moderate"
          : "Low",
    },
  ];

  const ratios = [
    { label: "ROE", value: formatPercent(data.roe) },
    { label: "Operating Margin", value: formatPercent(data.operatingMargin) },
    { label: "Debt / Equity", value: data.debtToEquity.toFixed(2) },
    { label: "Current Ratio", value: data.currentRatio.toFixed(2) },
    { label: "Beta", value: data.beta.toFixed(2) },
    { label: "Dividend Yield", value: formatPercent(data.dividendYield) },
    {
      label: "52 Week High",
      value: formatCurrency(data.fiftyTwoWeekHigh, data.currency),
    },
    {
      label: "52 Week Low",
      value: formatCurrency(data.fiftyTwoWeekLow, data.currency),
    },
  ];

  return (
    <div className={styles.financialsTab}>
      <div className="grid-4">
        {metrics.map((m) => {
          const rawVal = getMetricRawValue(m.label, data);
          const info = METRIC_TOOLTIPS[m.label];
          const health = info?.getHealth(rawVal) || "neutral";
          return (
            <div key={m.label} className={`glass-card ${styles.metricCard}`} data-health={health}>
              <div className={styles.metricHeader}>
                <m.icon size={16} className={styles.metricIcon} />
                <MetricTooltip label={m.label} value={rawVal}>
                  <span className={styles.metricLabel}>{m.label}</span>
                </MetricTooltip>
              </div>
              <span
                className={`${styles.metricValue} mono`}
                style={{ color: m.color }}
              >
                {m.value}
              </span>
              {m.sub && (
                <span className={styles.metricSub}>{m.sub}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className={`glass-card ${styles.ratiosCard}`}>
        <h4>Key Financial Ratios</h4>
        <div className={styles.ratiosGrid}>
          {ratios.map((r) => {
            const rawVal = getMetricRawValue(r.label, data);
            const info = METRIC_TOOLTIPS[r.label];
            const health = info?.getHealth(rawVal) || "neutral";
            return (
              <div key={r.label} className={styles.ratioItem}>
                <MetricTooltip label={r.label} value={rawVal}>
                  <span className={styles.ratioLabel}>{r.label}</span>
                </MetricTooltip>
                <span className={`${styles.ratioValue} mono`}>
                  <span className={styles.healthDot} data-health={health} />
                  {r.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {data.summary && data.summary !== "No summary available." && (
        <div className={`glass-card ${styles.summaryCard}`}>
          <h4>Company Overview</h4>
          <p className={styles.summaryText}>{data.summary}</p>
          {data.employees > 0 && (
            <div className={styles.summaryMeta}>
              <Users size={14} />
              <span>{formatNumber(data.employees, 0)} employees</span>
              {data.website && (
                <>
                  <span>•</span>
                  <a
                    href={data.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {data.website.replace(/^https?:\/\//, "")}
                    <ExternalLink size={12} />
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewsTab({
  data,
}: {
  data: NonNullable<ResearchState["newsData"]>;
}) {
  return (
    <div className={styles.newsTab}>
      {/* Sentiment Overview */}
      <div className={`glass-card-glow ${styles.sentimentOverview}`}>
        <div className={styles.sentimentHeader}>
          <div className={styles.tooltipWrapper}>
            <h4>Overall Sentiment</h4>
            <HelpCircle size={14} className={styles.helpIcon} />
            <div className={styles.tooltipContent}>
              <div className={styles.tooltipTitle}>
                <Info size={12} /> Sentiment Score
              </div>
              <div className={styles.tooltipBody}>
                Ranges from -1.0 (very bearish) to +1.0 (very bullish). Calculated by analyzing recent news headlines and article content using AI-powered natural language processing.
              </div>
              <div className={styles.tooltipInterpretation} data-health={data.overallSentiment >= 0.1 ? "good" : data.overallSentiment >= -0.1 ? "neutral" : "bad"}>
                <span className={styles.healthDot} data-health={data.overallSentiment >= 0.1 ? "good" : data.overallSentiment >= -0.1 ? "neutral" : "bad"} />
                {data.overallSentiment >= 0.5 ? "Strong positive sentiment" : data.overallSentiment >= 0.1 ? "Mildly positive" : data.overallSentiment >= -0.1 ? "Neutral / mixed signals" : data.overallSentiment >= -0.5 ? "Mildly negative" : "Strong negative sentiment"}
              </div>
            </div>
          </div>
          <span
            className={styles.sentimentBadge}
            style={{
              color: getSentimentColor(data.overallSentiment),
              borderColor: getSentimentColor(data.overallSentiment),
            }}
          >
            {data.sentimentLabel} ({data.overallSentiment.toFixed(2)})
          </span>
        </div>
        {data.keyThemes.length > 0 && (
          <div className={styles.themes}>
            <span className={styles.themesLabel}>Key Themes:</span>
            {data.keyThemes.map((theme) => (
              <span key={theme} className="pill pill-neutral">
                {theme}
              </span>
            ))}
          </div>
        )}
        {data.sourceBreakdown.length > 0 && (
          <div className={styles.sourceBreakdown}>
            {data.sourceBreakdown.map((s) => (
              <span key={s.source} className={styles.sourceItem}>
                {s.source}: {s.count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Articles */}
      <div className={styles.articlesList}>
        {data.articles.map((article, i) => (
          <div key={i} className={`glass-card ${styles.articleCard}`}>
            <div className={styles.articleHeader}>
              <span className={styles.articleSource}>{article.source}</span>
              <span className={styles.articleDate}>
                {formatDate(article.date)}
              </span>
            </div>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.articleTitle}
            >
              {article.title}
              <ExternalLink size={12} />
            </a>
            <div className={styles.articleFooter}>
              <div
                className={styles.sentimentDot}
                style={{
                  background: getSentimentColor(article.sentiment),
                }}
              />
              <span
                className={`${styles.sentimentScore} mono`}
                style={{
                  color: getSentimentColor(article.sentiment),
                }}
              >
                {article.sentiment >= 0 ? "+" : ""}
                {article.sentiment.toFixed(2)}
              </span>
              <div className={styles.sentimentBarContainer}>
                <div className={styles.sentimentBar}>
                  <div
                    className={styles.sentimentBarFill}
                    style={{
                      width: `${((article.sentiment + 1) / 2) * 100}%`,
                      background: getSentimentColor(article.sentiment),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompetitionTab({
  data,
  currency = "USD",
}: {
  data: NonNullable<ResearchState["competitiveData"]>;
  currency?: string;
}) {
  return (
    <div className={styles.competitionTab}>
      <div className="grid-2">
        <div className={`glass-card-glow ${styles.positionCard}`}>
          <h4>Market Position</h4>
          <p>{data.marketPosition}</p>
          <div className={styles.tooltipWrapper}>
            <div className={styles.moatBadge}>
              <Shield size={16} />
              <span>Moat: {data.moatRating}</span>
            </div>
            <HelpCircle size={12} className={styles.helpIcon} />
            <div className={styles.tooltipContent}>
              <div className={styles.tooltipTitle}>
                <Info size={12} /> Economic Moat
              </div>
              <div className={styles.tooltipBody}>
                An economic moat is a company&apos;s ability to maintain competitive advantages and protect long-term profits. Wide moats are rare and highly valued by investors.
              </div>
              <div className={styles.tooltipInterpretation} data-health={data.moatRating === "Wide" ? "good" : data.moatRating === "Narrow" ? "neutral" : "bad"}>
                <span className={styles.healthDot} data-health={data.moatRating === "Wide" ? "good" : data.moatRating === "Narrow" ? "neutral" : "bad"} />
                {data.moatRating === "Wide" ? "Strong competitive fortress" : data.moatRating === "Narrow" ? "Some competitive protection" : "Vulnerable to competition"}
              </div>
            </div>
          </div>
          <p className={styles.marketShare}>{data.marketShare}</p>
        </div>
        <div className={`glass-card ${styles.outlookCard}`}>
          <h4>Industry Outlook</h4>
          <p>{data.industryOutlook}</p>
        </div>
      </div>

      {data.competitors.length > 0 && (
        <div className={`glass-card ${styles.competitorsTable}`}>
          <h4>Peer Comparison</h4>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Company</th>
                <th>Ticker</th>
                <th>Market Cap</th>
                <th>P/E Ratio</th>
              </tr>
            </thead>
            <tbody>
              {data.competitors.map((c) => (
                <tr key={c.ticker}>
                  <td>{c.name}</td>
                  <td className="mono">{c.ticker}</td>
                  <td className="mono">{formatCurrency(c.marketCap, currency, true)}</td>
                  <td className="mono">
                    {c.peRatio > 0 ? c.peRatio.toFixed(1) : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid-2">
        <div className={`glass-card ${styles.advantagesList}`}>
          <h4 style={{ color: "var(--color-primary)" }}>
            <TrendingUp size={16} /> Competitive Advantages
          </h4>
          <ul>
            {data.competitiveAdvantages.map((adv, i) => (
              <li key={i}>{adv}</li>
            ))}
          </ul>
        </div>
        <div className={`glass-card ${styles.advantagesList}`}>
          <h4 style={{ color: "var(--color-danger)" }}>
            <TrendingDown size={16} /> Competitive Disadvantages
          </h4>
          <ul>
            {data.competitiveDisadvantages.map((dis, i) => (
              <li key={i}>{dis}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function RiskTab({
  data,
}: {
  data: NonNullable<ResearchState["riskData"]>;
}) {
  return (
    <div className={styles.riskTab}>
      <div
        className={`glass-card-glow ${styles.riskScoreCard}`}
        style={{
          borderColor: getRiskColor(data.riskLevel),
        }}
      >
        <div className={styles.riskScoreHeader}>
          <div className={styles.tooltipWrapper}>
            <h4>Overall Risk Score</h4>
            <HelpCircle size={14} className={styles.helpIcon} />
            <div className={styles.tooltipContent}>
              <div className={styles.tooltipTitle}>
                <Info size={12} /> Risk Score
              </div>
              <div className={styles.tooltipBody}>
                Composite score from 1 (very low risk) to 10 (extreme risk). Synthesized from financial health, market volatility, competitive position, and news sentiment analysis.
              </div>
              <div className={styles.tooltipInterpretation} data-health={data.riskScore <= 3 ? "good" : data.riskScore <= 6 ? "neutral" : "bad"}>
                <span className={styles.healthDot} data-health={data.riskScore <= 3 ? "good" : data.riskScore <= 6 ? "neutral" : "bad"} />
                {data.riskScore <= 3 ? "Low risk investment" : data.riskScore <= 6 ? "Moderate risk — monitor closely" : "High risk — proceed with caution"}
              </div>
            </div>
          </div>
          <div className={styles.riskScoreDisplay}>
            <span
              className={styles.riskScoreNumber}
              style={{ color: getRiskColor(data.riskLevel) }}
            >
              {data.riskScore}
            </span>
            <span className={styles.riskScoreMax}>/10</span>
          </div>
        </div>
        <span
          className={styles.riskLevel}
          style={{ color: getRiskColor(data.riskLevel) }}
        >
          {data.riskLevel} Risk
        </span>
        <div className="confidence-meter">
          <div
            className="confidence-meter-fill"
            style={{
              width: `${data.riskScore * 10}%`,
              background: `linear-gradient(90deg, var(--color-primary), var(--color-tertiary), var(--color-danger))`,
            }}
          />
        </div>
      </div>

      <div className={styles.risksList}>
        {data.risks.map((risk, i) => (
          <div key={i} className={`glass-card ${styles.riskItem}`}>
            <div className={styles.riskItemHeader}>
              <span className={styles.riskCategory}>{risk.category}</span>
              <span
                className={`pill ${
                  risk.severity === "Critical" || risk.severity === "High"
                    ? "pill-danger"
                    : risk.severity === "Medium"
                    ? "pill-warning"
                    : "pill-primary"
                }`}
              >
                {risk.severity}
              </span>
            </div>
            <p className={styles.riskDescription}>{risk.description}</p>
            <div className={styles.severityBar} data-severity={risk.severity} />
          </div>
        ))}
      </div>

      {data.mitigants.length > 0 && (
        <div className={`glass-card ${styles.mitigantsCard}`}>
          <h4>
            <Shield size={16} /> Risk Mitigants
          </h4>
          <ul>
            {data.mitigants.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MemoTab({
  decision,
  currency,
}: {
  decision: NonNullable<ResearchState["decision"]>;
  currency: string;
}) {
  return (
    <div className={styles.memoTab}>
      <div className="grid-2">
        <div className={`glass-card ${styles.bullBearCard}`}>
          <h4 style={{ color: "var(--color-primary)" }}>
            <TrendingUp size={16} /> Bull Case
          </h4>
          <ul>
            {decision.keyBullPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
        <div className={`glass-card ${styles.bullBearCard}`}>
          <h4 style={{ color: "var(--color-danger)" }}>
            <TrendingDown size={16} /> Bear Case
          </h4>
          <ul>
            {decision.keyBearPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className={`glass-card ${styles.targetPrice}`}>
        <div className={styles.targetPriceRow}>
          <div>
            <span className={styles.targetLabel}>Target Price Range</span>
            <span className={`${styles.targetValue} mono`}>
              {formatCurrency(decision.targetPriceRange.low, currency)} –{" "}
              {formatCurrency(decision.targetPriceRange.high, currency)}
            </span>
          </div>
          <div>
            <span className={styles.targetLabel}>Time Horizon</span>
            <span className={styles.targetValue}>
              <Clock size={14} /> {decision.timeHorizon}
            </span>
          </div>
        </div>
      </div>

      <div className={`glass-card ${styles.memoCard}`}>
        <h4>Investment Memo</h4>
        <div className={styles.memoContent}>
          {decision.investmentMemo.split("\n").map((line, i) => {
            if (line.startsWith("## ")) {
              return (
                <h3 key={i} className={styles.memoH3}>
                  {line.replace("## ", "")}
                </h3>
              );
            }
            if (line.startsWith("### ")) {
              return (
                <h4 key={i} className={styles.memoH4}>
                  {line.replace("### ", "")}
                </h4>
              );
            }
            if (line.trim() === "") return <br key={i} />;
            return (
              <p key={i} className={styles.memoParagraph}>
                {line}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ===== MAIN EXPORT WITH SUSPENSE ===== */
export default function ResearchPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
          }}
        >
          <Brain size={32} style={{ color: "var(--color-primary)" }} />
        </main>
      }
    >
      <ResearchContent />
    </Suspense>
  );
}
