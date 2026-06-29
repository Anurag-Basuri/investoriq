// Utility formatters for currency, numbers, and financial data

export function formatCurrency(value: number, currency: string = "USD", compact: boolean = false): string {
  const getSymbol = (currency: string) => {
    try {
      const parts = new Intl.NumberFormat("en-US", { style: "currency", currency }).formatToParts(1);
      const symbol = parts.find((p) => p.type === "currency")?.value;
      return symbol || currency;
    } catch {
      return "$";
    }
  };

  const symbol = getSymbol(currency);

  if (compact) {
    if (value >= 1e12) return `${symbol}${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${symbol}${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${symbol}${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${symbol}${(value / 1e3).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(decimals)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(decimals)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(decimals)}K`;
  return value.toFixed(decimals);
}

export function formatPercent(value: number, decimals: number = 1): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case "Strong Buy":
      return "var(--color-primary)";
    case "Buy":
      return "var(--color-primary)";
    case "Hold":
      return "var(--color-tertiary)";
    case "Sell":
      return "var(--color-danger)";
    case "Strong Sell":
      return "var(--color-danger)";
    default:
      return "var(--color-text-secondary)";
  }
}

export function getSentimentColor(sentiment: number): string {
  if (sentiment >= 0.5) return "var(--color-primary)";
  if (sentiment >= 0.1) return "#4ade80";
  if (sentiment >= -0.1) return "var(--color-tertiary)";
  if (sentiment >= -0.5) return "#fb923c";
  return "var(--color-danger)";
}

export function getRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case "Low":
      return "var(--color-primary)";
    case "Medium":
      return "var(--color-tertiary)";
    case "High":
      return "var(--color-danger)";
    case "Critical":
      return "#dc2626";
    default:
      return "var(--color-text-secondary)";
  }
}

export function generateResearchId(): string {
  return `research_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
