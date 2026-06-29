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
          <XCircle size={48} className={styles.errorIcon} />
          <h2>Research Failed</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => router.push("/")}>
            <ArrowLeft size={18} /> Try Again
          </button>
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
                  <span className={styles.verdictConfidence}>
                    Confidence: {decision.confidenceScore}/100
                  </span>
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
        {metrics.map((m) => (
          <div key={m.label} className={`glass-card ${styles.metricCard}`}>
            <div className={styles.metricHeader}>
              <m.icon size={16} className={styles.metricIcon} />
              <span className={styles.metricLabel}>{m.label}</span>
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
        ))}
      </div>

      <div className={`glass-card ${styles.ratiosCard}`}>
        <h4>Key Financial Ratios</h4>
        <div className={styles.ratiosGrid}>
          {ratios.map((r) => (
            <div key={r.label} className={styles.ratioItem}>
              <span className={styles.ratioLabel}>{r.label}</span>
              <span className={`${styles.ratioValue} mono`}>{r.value}</span>
            </div>
          ))}
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
          <h4>Overall Sentiment</h4>
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
          <div className={styles.moatBadge}>
            <Shield size={16} />
            <span>Moat: {data.moatRating}</span>
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
          <h4>Overall Risk Score</h4>
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
