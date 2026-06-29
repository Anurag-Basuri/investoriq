// Agent Node: Analyze news from multiple sources and score sentiment
import { ResearchState, NewsData, NewsArticle } from "../state";
import { fetchMultipleNewsQueries } from "../../datasources/googleNews";
import { getRedditSentiment } from "../../datasources/redditSearch";
import { NEWS_SENTIMENT_PROMPT } from "../prompts";
import { invokeLLM, parseLLMJson } from "../../utils/llm";

export async function analyzeNewsNode(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  const startTime = new Date().toISOString();
  const { companyFullName, tickerSymbol } = state;

  try {
    // Fetch from multiple news sources in parallel
    const [googleNewsResult, redditResult] = await Promise.allSettled([
      fetchMultipleNewsQueries(companyFullName, tickerSymbol),
      getRedditSentiment(companyFullName, tickerSymbol),
    ]);

    const googleArticles =
      googleNewsResult.status === "fulfilled" ? googleNewsResult.value : [];
    const redditPosts =
      redditResult.status === "fulfilled" ? redditResult.value : [];

    // Convert Reddit posts to article format for unified analysis
    const redditArticles = redditPosts.map((post) => ({
      title: post.title,
      source: `Reddit r/${post.subreddit}`,
      url: post.url,
      date: post.date,
      snippet: post.snippet || `Score: ${post.score}, Comments: ${post.numComments}`,
    }));

    // Combine all articles
    const allArticles = [
      ...googleArticles.map((a) => ({
        title: a.title,
        source: a.source,
        url: a.url,
        date: a.date,
        snippet: a.snippet,
      })),
      ...redditArticles,
    ];

    if (allArticles.length === 0) {
      return {
        newsData: {
          articles: [],
          overallSentiment: 0,
          sentimentLabel: "Neutral",
          keyThemes: ["No recent news found"],
          sourceBreakdown: [],
        },
        agentLog: [
          {
            agent: "News & Sentiment",
            action: "No articles found",
            detail: "Could not find recent news articles",
            timestamp: startTime,
            status: "complete" as const,
          },
        ],
      };
    }

    // Use LLM to analyze sentiment
    const articlesForPrompt = allArticles
      .slice(0, 15)
      .map(
        (a, i) =>
          `[${i}] "${a.title}" — ${a.source} (${a.date})\n   ${a.snippet}`
      )
      .join("\n\n");

    const prompt = NEWS_SENTIMENT_PROMPT
      .replace("{companyName}", companyFullName)
      .replace("{tickerSymbol}", tickerSymbol)
      .replace("{articles}", articlesForPrompt);

    let sentimentAnalysis: {
      overallSentiment?: number;
      sentimentLabel?: string;
      keyThemes?: string[];
      articleSentiments?: Array<{ index: number; sentiment: number }>;
    };

    try {
      const responseText = await invokeLLM(prompt, { temperature: 0.1 });
      sentimentAnalysis = parseLLMJson(responseText);
    } catch {
      // LLM failed — provide basic sentiment data without AI analysis
      console.warn("LLM sentiment analysis failed, using fallback");
      sentimentAnalysis = {
        overallSentiment: 0,
        sentimentLabel: "Neutral",
        keyThemes: ["Unable to analyze sentiment — LLM unavailable"],
        articleSentiments: [],
      };
    }

    // Map sentiments to articles
    const articlesWithSentiment: NewsArticle[] = allArticles
      .slice(0, 15)
      .map((a, i) => ({
        ...a,
        sentiment:
          sentimentAnalysis.articleSentiments?.find(
            (s) => s.index === i
          )?.sentiment || 0,
      }));

    // Calculate source breakdown
    const sourceMap = new Map<string, number>();
    for (const article of articlesWithSentiment) {
      const source = article.source.split(" - ")[0].trim();
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    }
    const sourceBreakdown = Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    const newsData: NewsData = {
      articles: articlesWithSentiment,
      overallSentiment: sentimentAnalysis.overallSentiment || 0,
      sentimentLabel: (sentimentAnalysis.sentimentLabel as NewsData["sentimentLabel"]) || "Neutral",
      keyThemes: sentimentAnalysis.keyThemes || [],
      sourceBreakdown,
    };

    return {
      newsData,
      agentLog: [
        {
          agent: "News & Sentiment",
          action: "Analysis complete",
          detail: `Analyzed ${articlesWithSentiment.length} articles from ${sourceBreakdown.length} sources. Sentiment: ${newsData.sentimentLabel} (${newsData.overallSentiment.toFixed(2)})`,
          timestamp: startTime,
          status: "complete" as const,
        },
      ],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return {
      newsData: {
        articles: [],
        overallSentiment: 0,
        sentimentLabel: "Neutral",
        keyThemes: [],
        sourceBreakdown: [],
      },
      errors: [`News analysis failed: ${errorMsg}`],
      agentLog: [
        {
          agent: "News & Sentiment",
          action: "Failed",
          detail: errorMsg,
          timestamp: startTime,
          status: "error" as const,
        },
      ],
    };
  }
}
