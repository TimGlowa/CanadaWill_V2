import axios from 'axios';
import crypto from 'crypto';

interface NewsAPISearchParams {
  name: string;
  aliases: string[];
  riding?: string;
  city?: string;
  windowDays: number;
  pageSize: number;
  slug: string; // Add slug parameter
}

interface NewsAPIArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

interface NormalizedArticle {
  id: string;
  url: string;
  title: string;
  source: 'newsapi';
  publishedAt: string;
  author: string | null;
  snippet: string | null;
  personSlug: string;
  providerMeta: {
    rawId: string;
    sourceName: string;
    urlToImage: string | null;
  };
}

export class NewsAPIClient {
  private apiKey: string;
  private baseUrl = 'https://newsapi.org/v2';

  constructor() {
    this.apiKey = process.env.NEWS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('NewsAPI client disabled: NEWS_API_KEY not set');
    }
  }

  isEnabled(): boolean {
    return !!this.apiKey;
  }

  async search(params: NewsAPISearchParams): Promise<{ raw: NewsAPIResponse | null; normalized: NormalizedArticle[]; error?: string }> {
    if (!this.isEnabled()) {
      console.log('[NEWSAPI] Client disabled, skipping search');
      return { raw: null, normalized: [] };
    }

    try {
      console.log(`[NEWSAPI] Starting search for: ${params.name}`);
      
      // Use minimal, known-good query recipe
      const query = `"${params.name}" AND ("Alberta separation" OR "Alberta independence" OR "sovereignty")`;
      console.log(`[NEWSAPI] Using minimal query: ${query}`);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - params.windowDays);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log(`[NEWSAPI] Date range: ${startDateStr} to ${endDateStr}`);
      
      const searchParams = new URLSearchParams({
        q: query,
        from: startDateStr,
        to: endDateStr,
        sortBy: 'publishedAt',
        pageSize: Math.min(params.pageSize, 10).toString(), // Limit to small page size
        language: 'en',
        apiKey: this.apiKey
      });

      const url = `${this.baseUrl}/everything?${searchParams}`;
      console.log(`[NEWSAPI] Making request to: ${url.replace(this.apiKey, '***')}`);
      
      const startTime = Date.now();
      const response = await axios.get<NewsAPIResponse>(url, {
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'CanadaWill-NewsIngest/1.0'
        }
      });
      const responseTime = Date.now() - startTime;
      
      // Structured logging for Application Insights
      console.log(`[NEWSAPI] HTTP Status: ${response.status}, Response Time: ${responseTime}ms`);
      console.log(`[NEWSAPI] API Status: ${response.data.status}, Total Results: ${response.data.totalResults}`);
      console.log(`[NEWSAPI] Articles Returned: ${response.data.articles?.length || 0}`);
      
      if (response.data.status !== 'ok') {
        const errorMsg = `NewsAPI API error: ${response.data.status}`;
        console.error(`[NEWSAPI] ${errorMsg}`);
        return { raw: null, normalized: [], error: errorMsg };
      }

      const normalized = (response.data.articles || []).map(article => 
        this.normalizeArticle(article, params.slug)
      );
      
      console.log(`[NEWSAPI] Successfully normalized ${normalized.length} articles for ${params.name}`);
      
      return {
        raw: response.data,
        normalized
      };
      
    } catch (error: any) {
      // Enhanced error logging for Application Insights
      const errorDetails = {
        provider: 'newsapi',
        personName: params.name,
        personSlug: params.slug,
        error: error.message || String(error),
        statusCode: error.response?.status,
        statusText: error.response?.statusText,
        timestamp: new Date().toISOString()
      };
      
      console.error(`[NEWSAPI] Search failed for ${params.name}:`, JSON.stringify(errorDetails, null, 2));
      
      // Return safe default instead of throwing
      return { 
        raw: null, 
        normalized: [], 
        error: error.message || String(error) 
      };
    }
  }

  private normalizeArticle(article: NewsAPIArticle, personSlug: string): NormalizedArticle {
    const urlHash = crypto.createHash('sha1').update(article.url.toLowerCase()).digest('hex');
    
    return {
      id: urlHash,
      url: article.url,
      title: article.title,
      source: 'newsapi',
      publishedAt: article.publishedAt,
      author: article.author,
      snippet: article.description,
      personSlug,
      providerMeta: {
        rawId: article.source.id || '',
        sourceName: article.source.name,
        urlToImage: article.urlToImage
      }
    };
  }
} 