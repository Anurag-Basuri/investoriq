"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Database,
  Brain,
  FileText,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
} from "lucide-react";
import styles from "./page.module.css";

const EXAMPLE_COMPANIES = [
  { name: "Apple", icon: "🍎" },
  { name: "Tesla", icon: "⚡" },
  { name: "NVIDIA", icon: "🎮" },
  { name: "Reliance Industries", icon: "🏭" },
  { name: "Infosys", icon: "💻" },
  { name: "Microsoft", icon: "🪟" },
  { name: "Amazon", icon: "📦" },
];

const FEATURES = [
  {
    icon: Database,
    title: "5+ Data Sources",
    description:
      "Yahoo Finance, Alpha Vantage, Google News, Reddit, and more — cross-referenced for reliability.",
    accent: "primary",
  },
  {
    icon: Brain,
    title: "Multi-Agent AI",
    description:
      "6 specialized LangGraph agents for financials, news, sentiment, competition, risk, and verdict.",
    accent: "secondary",
  },
  {
    icon: FileText,
    title: "Investment Memo",
    description:
      "Structured investment thesis with Buy/Sell/Hold verdict, confidence score, and full reasoning.",
    accent: "tertiary",
  },
];

const STATS = [
  { label: "Data Points Analyzed", value: "50+", icon: TrendingUp },
  { label: "AI Agents Working", value: "6", icon: Zap },
  { label: "News Sources Scanned", value: "3+", icon: Shield },
];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSearch = (companyName: string) => {
    if (!companyName.trim()) return;
    setIsLoading(true);
    router.push(`/research?company=${encodeURIComponent(companyName.trim())}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  return (
    <main className={styles.main}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={`container ${styles.navContent}`}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <Sparkles size={22} />
            </div>
            <span className={styles.logoText}>InvestorIQ</span>
          </div>
          <div className={styles.navBadge}>
            <Brain size={14} />
            <span>Multi-Agent AI Pipeline</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <div className={`${styles.heroBadge} animate-fade-in-up`}>
              <Sparkles size={14} />
              <span>AI-Powered Investment Intelligence</span>
            </div>

            <h1 className={`${styles.heroTitle} animate-fade-in-up delay-1`}>
              Research Any Company.
              <br />
              <span className={styles.heroGradient}>Get an AI Verdict.</span>
            </h1>

            <p className={`${styles.heroSubtitle} animate-fade-in-up delay-2`}>
              Enter any company name. Our multi-agent AI system researches
              financials, news, sentiment, and competitive position — then
              delivers a Wall Street-grade investment verdict.
            </p>

            {/* Search Bar */}
            <form
              onSubmit={handleSubmit}
              className={`${styles.searchWrapper} animate-fade-in-up delay-3`}
            >
              <div className={styles.searchBar}>
                <Search
                  size={20}
                  className={styles.searchIcon}
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search any company... (e.g., Apple, Tesla, Reliance Industries)"
                  className={styles.searchInput}
                  disabled={isLoading}
                  id="search-input"
                />
                <button
                  type="submit"
                  className={`btn btn-primary btn-lg ${styles.searchButton}`}
                  disabled={isLoading || !query.trim()}
                  id="analyze-button"
                >
                  {isLoading ? (
                    <span className={styles.spinner} />
                  ) : (
                    <>
                      Analyze
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Example Company Chips */}
            <div className={`${styles.chips} animate-fade-in-up delay-4`}>
              <span className={styles.chipsLabel}>Try:</span>
              {EXAMPLE_COMPANIES.map((company) => (
                <button
                  key={company.name}
                  className={styles.chip}
                  onClick={() => handleSearch(company.name)}
                  disabled={isLoading}
                  id={`chip-${company.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <span>{company.icon}</span>
                  <span>{company.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className={`${styles.statsBar} animate-fade-in-up delay-5`}>
        <div className="container">
          <div className={styles.statsGrid}>
            {STATS.map((stat) => (
              <div key={stat.label} className={styles.statItem}>
                <stat.icon size={20} className={styles.statIcon} />
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className="container">
          <div className="grid-3">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className={`glass-card ${styles.featureCard} animate-fade-in-up delay-${i + 1}`}
              >
                <div
                  className={styles.featureIcon}
                  data-accent={feature.accent}
                >
                  <feature.icon size={24} />
                </div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <p>
            Built with Next.js, LangGraph.js &amp; Llama 3 · InvestorIQ ©{" "}
            {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </main>
  );
}
