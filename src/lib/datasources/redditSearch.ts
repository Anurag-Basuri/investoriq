// Reddit search for retail investor sentiment

export interface RedditPost {
  title: string;
  subreddit: string;
  url: string;
  score: number;
  numComments: number;
  date: string;
  snippet: string;
}

export async function searchReddit(
  query: string,
  limit: number = 10
): Promise<RedditPost[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.reddit.com/search.json?q=${encodedQuery}&sort=relevance&t=month&limit=${limit}&type=link`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "InvestorIQ/1.0 (Research Agent)",
      },
    });

    if (!response.ok) {
      console.error("Reddit search error:", response.status);
      return [];
    }

    const data = await response.json();
    const posts: RedditPost[] = [];

    if (data?.data?.children) {
      for (const child of data.data.children) {
        const post = child.data;
        if (post) {
          posts.push({
            title: post.title || "",
            subreddit: post.subreddit || "",
            url: `https://reddit.com${post.permalink || ""}`,
            score: post.score || 0,
            numComments: post.num_comments || 0,
            date: post.created_utc
              ? new Date(post.created_utc * 1000).toISOString()
              : new Date().toISOString(),
            snippet: (post.selftext || "").substring(0, 200),
          });
        }
      }
    }

    return posts;
  } catch (error) {
    console.error("Reddit search error:", error);
    return [];
  }
}

export async function getRedditSentiment(
  companyName: string,
  ticker: string
): Promise<RedditPost[]> {
  // Search across relevant subreddits
  const queries = [
    `${ticker} subreddit:wallstreetbets OR subreddit:stocks OR subreddit:investing`,
    `${companyName} stock analysis`,
  ];

  const results = await Promise.allSettled(
    queries.map((q) => searchReddit(q, 5))
  );

  const allPosts: RedditPost[] = [];
  const seenTitles = new Set<string>();

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const post of result.value) {
        const normalizedTitle = post.title.toLowerCase().trim();
        if (!seenTitles.has(normalizedTitle)) {
          seenTitles.add(normalizedTitle);
          allPosts.push(post);
        }
      }
    }
  }

  // Sort by engagement (score + comments)
  return allPosts
    .sort((a, b) => b.score + b.numComments - (a.score + a.numComments))
    .slice(0, 10);
}
