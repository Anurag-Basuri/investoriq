// Generic web scraper using cheerio
import * as cheerio from "cheerio";

export interface ScrapedContent {
  title: string;
  text: string;
  url: string;
}

export async function scrapeUrl(url: string): Promise<ScrapedContent | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, and navigation
    $("script, style, nav, footer, header, aside, .ad, .advertisement").remove();

    const title = $("title").text().trim() || $("h1").first().text().trim();
    const paragraphs: string[] = [];

    $("p, article, .content, .post-body, .entry-content")
      .each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 50) {
          paragraphs.push(text);
        }
      });

    const text = paragraphs.join("\n\n").substring(0, 3000);

    return {
      title,
      text,
      url,
    };
  } catch (error) {
    console.error(`Scrape error for ${url}:`, error);
    return null;
  }
}

export async function scrapeMultipleUrls(
  urls: string[],
  maxConcurrent: number = 3
): Promise<ScrapedContent[]> {
  const results: ScrapedContent[] = [];

  // Process in batches to avoid overwhelming servers
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent);
    const batchResults = await Promise.allSettled(batch.map(scrapeUrl));

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value) {
        results.push(result.value);
      }
    }
  }

  return results;
}
