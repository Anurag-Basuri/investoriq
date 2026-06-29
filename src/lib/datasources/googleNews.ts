// Google News RSS parser — free news source
import * as cheerio from "cheerio";

export interface GoogleNewsArticle {
  title: string;
  source: string;
  url: string;
  date: string;
  snippet: string;
}

export async function fetchGoogleNews(query: string, count: number = 10): Promise<GoogleNewsArticle[]> {
  try {
    // Google News RSS feed
    const encodedQuery = encodeURIComponent(query);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}+stock+OR+shares+OR+market&hl=en&gl=US&ceid=US:en`;

    const response = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; InvestorIQ/1.0)",
      },
    });

    if (!response.ok) {
      console.error("Google News RSS error:", response.status);
      return [];
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const articles: GoogleNewsArticle[] = [];

    $("item")
      .slice(0, count)
      .each((_, element) => {
        const title = $(element).find("title").text().trim();
        const link = $(element).find("link").text().trim();
        const pubDate = $(element).find("pubDate").text().trim();
        const source = $(element).find("source").text().trim();
        const description = $(element).find("description").text().trim();

        // Extract a snippet from the description HTML
        const descHtml = cheerio.load(description);
        const snippet = descHtml.text().trim().substring(0, 200);

        if (title) {
          articles.push({
            title,
            source: source || "Google News",
            url: link,
            date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            snippet,
          });
        }
      });

    return articles;
  } catch (error) {
    console.error("Google News fetch error:", error);
    return [];
  }
}

export async function fetchMultipleNewsQueries(
  companyName: string,
  ticker: string
): Promise<GoogleNewsArticle[]> {
  // Run multiple queries for broader coverage
  const queries = [
    `${companyName} stock`,
    `${ticker} earnings revenue`,
    `${companyName} investors analysis`,
  ];

  const results = await Promise.allSettled(
    queries.map((q) => fetchGoogleNews(q, 5))
  );

  const allArticles: GoogleNewsArticle[] = [];
  const seenTitles = new Set<string>();

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const article of result.value) {
        // Deduplicate by title
        const normalizedTitle = article.title.toLowerCase().trim();
        if (!seenTitles.has(normalizedTitle)) {
          seenTitles.add(normalizedTitle);
          allArticles.push(article);
        }
      }
    }
  }

  return allArticles.slice(0, 15);
}
