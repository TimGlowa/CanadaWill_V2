import axios from 'axios';
import crypto from 'crypto';

interface NewsDataSearchParams {
  name: string;
  aliases: string[];
  riding?: string;
  city?: string;
  windowDays: number;
  pageSize: number;
  slug: string; // Add slug parameter
}

interface NewsDataArticle {
  article_id: string;
  title: string;
  link: string;
  description: string;
  content: string;
  pubDate: string;
  image_url: string | null;
  source_id: string;
  source_url: string;
  source_icon: string | null;
  source_priority: number;
  country: string[];
  category: string[];
  language: string;
}

interface NewsDataResponse {
  status: string;
  totalResults: number;
  results: NewsDataArticle[];
  nextPage: string | null;
}

interface NormalizedArticle {
  id: string;
  url: string;
  title: string;
  source: 'newsdata';
  publishedAt: string;
  author: string | null;
  snippet: string | null;
  personSlug: string;
  providerMeta: {
    rawId: string;
    sourceId: string;
    sourceUrl: string;
    imageUrl: string | null;
  };
}

export class NewsDataClient {
  private apiKey: string;
  private baseUrl = 'https://newsdata.io/api/1';

  constructor() {
    this.apiKey = process.env.NEWSDATAIO_API_KEY || '';
    if (!this.apiKey) {
      console.warn('NewsData client disabled: NEWSDATAIO_API_KEY not set');
    }
  }

  isEnabled(): boolean {
    return !!this.apiKey;
  }

  async search(params: NewsDataSearchParams): Promise<{ raw: NewsDataResponse | null; normalized: NormalizedArticle[]; error?: string }> {
    if (!this.isEnabled()) {
      console.log('[NEWSDATA] Client disabled, skipping search');
      return { raw: null, normalized: [] };
    }

    try {
      console.log(`[NEWSDATA] Starting search for: ${params.name}`);
      
      // Use minimal, known-good query recipe
      const query = `"${params.name}" AND ("Alberta separation" OR "Alberta independence" OR "sovereignty")`;
      console.log(`[NEWSDATA] Using minimal query: ${query}`);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - params.windowDays);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log(`[NEWSDATA] Date range: ${startDateStr} to ${endDateStr}`);
      
      const searchParams = new URLSearchParams({
        q: query,
        from: startDateStr,
        to: endDateStr,
        size: Math.min(params.pageSize, 10).toString(), // Limit to small page size
        language: 'en',
        apikey: this.apiKey
      });

      const url = `${this.baseUrl}/news?${searchParams}`;
      console.log(`[NEWSDATA] Making request to: ${url.replace(this.apiKey, '***')}`);
      
      const startTime = Date.now();
      const response = await axios.get<NewsDataResponse>(url, {
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'CanadaWill-NewsIngest/1.0'
        }
      });
      const responseTime = Date.now() - startTime;
      
      // Structured logging for Application Insights
      console.log(`[NEWSDATA] HTTP Status: ${response.status}, Response Time: ${responseTime}ms`);
      console.log(`[NEWSDATA] API Status: ${response.data.status}, Total Results: ${response.data.totalResults}`);
      console.log(`[NEWSDATA] Articles Returned: ${response.data.results?.length || 0}`);
      
      if (response.data.status !== 'success') {
        const errorMsg = `NewsData API error: ${response.data.status}`;
        console.error(`[NEWSDATA] ${errorMsg}`);
        return { raw: null, normalized: [], error: errorMsg };
      }

      const normalized = (response.data.results || []).map(article => 
        this.normalizeArticle(article, params.slug)
      );
      
      console.log(`[NEWSDATA] Successfully normalized ${normalized.length} articles for ${params.name}`);
      
      return {
        raw: response.data,
        normalized
      };
    } catch (error: any) {
      // Enhanced error logging for Application Insights
      const errorDetails = {
        provider: 'newsdata',
        personName: params.name,
        personSlug: params.slug,
        error: error.message || String(error),
        statusCode: error.response?.status,
        statusText: error.response?.statusText,
        timestamp: new Date().toISOString()
      };
      
      console.error(`[NEWSDATA] Search failed for ${params.name}:`, JSON.stringify(errorDetails, null, 2));
      
      // Return safe default instead of throwing
      return { 
        raw: null, 
        normalized: [], 
        error: error.message || String(error) 
      };
    }
  }

  private normalizeArticle(article: NewsDataArticle, personSlug: string): NormalizedArticle {
    const urlHash = crypto.createHash('sha1').update(article.link.toLowerCase()).digest('hex');
    
    return {
      id: urlHash,
      url: article.link,
      title: article.title,
      source: 'newsdata',
      publishedAt: article.pubDate,
      author: null, // NewsData doesn't provide author
      snippet: article.description,
      personSlug,
      providerMeta: {
        rawId: article.article_id,
        sourceId: article.source_id,
        sourceUrl: article.source_url,
        imageUrl: article.image_url
      }
    };
  }
} 