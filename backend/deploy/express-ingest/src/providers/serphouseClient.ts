interface SerphouseResponse {
  search_metadata: {
    status: string;
    created_at: string;
    processed_at: string;
  };
  search_parameters: {
    q: string;
    domain: string;
    serp_type: string;
    date_range: string;
  };
  search_information: {
    total_results: number;
    time_taken_displayed: number;
  };
  news_results: Array<{
    position: number;
    title: string;
    link: string;
    source: string;
    date: string;
    snippet: string;
    thumbnail?: string;
  }>;
}

interface NormalizedArticle {
  id: string;
  source: string;
  url: string;
  title: string;
  publishedAt: string;
  author: string;
  snippet: string;
  person: string;
  riding: string;
  rawData: any;
}

export async function fetchNews({ 
  query, 
  from, 
  to, 
  domains = ['google.com'] 
}: {
  query: string;
  from: string;
  to: string;
  domains?: string[];
}): Promise<NormalizedArticle[]> {
  const apiToken = process.env.SERPHOUSE_API_TOKEN;
  if (!apiToken) {
    throw new Error('SERPHOUSE_API_TOKEN environment variable is required');
  }

  const results: NormalizedArticle[] = [];
  
  for (const domain of domains) {
    try {
      const dateRange = `${from},${to}`;
      const url = 'https://api.serphouse.com/serp/live';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain,
          serp_type: 'news',
          q: query,
          date_range: dateRange,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: SerphouseResponse = await response.json();
      
      if (data.news_results) {
        const normalized = data.news_results.map((article, index) => ({
          id: `${domain}-${Date.now()}-${index}`,
          source: 'serphouse',
          url: article.link,
          title: article.title,
          publishedAt: article.date || new Date().toISOString(),
          author: article.source || 'Unknown',
          snippet: article.snippet,
          person: query.replace(/"/g, '').split(' AND ')[0], // Extract person name from query
          riding: 'Unknown', // SERPHouse doesn't provide riding info
          rawData: article,
        }));
        
        results.push(...normalized);
      }
    } catch (error) {
      console.error(`[SERPHOUSE] Error fetching from ${domain}:`, error);
      // Continue with other domains
    }
  }

  return results;
}

export function isEnabled(): boolean {
  return !!(process.env.SERPHOUSE_API_TOKEN && process.env.ENABLE_SERPHOUSE === 'true');
}
