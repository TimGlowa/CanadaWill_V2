import { NewsAPIClient } from '../providers/newsapiClient';
import { NewsDataClient } from '../providers/newsdataClient';
import { BlobStore } from '../storage/blobStore';
import * as fs from 'fs';
import * as path from 'path';

interface PersonRecord {
  slug: string;
  fullName: string;
  office: string;
  riding?: string;
  aliases: string[];
  city?: string;
}

interface IngestSummary {
  runId: string;
  slug: string;
  windowDays: number;
  counts: {
    requested: number;
    normalized: number;
    newSaved: number;
    dupSkipped: number;
  };
  sources: {
    newsapi: { requests: number; normCount: number };
    newsdata: { requests: number; normCount: number };
  };
  startedAt: string;
  finishedAt: string;
  errors: string[];
}

interface BatchResult {
  runId: string;
  totals: {
    requested: number;
    normalized: number;
    newSaved: number;
    dupSkipped: number;
    errors: number;
  };
  limits: {
    newsapi: { used: number; cap: number; exhausted: boolean };
    newsdata: { used: number; cap: number; exhausted: boolean };
  };
  slugResults: IngestSummary[];
}

export class IngestOrchestrator {
  private newsapiClient: NewsAPIClient;
  private newsdataClient: NewsDataClient;
  private blobStore: BlobStore | null;
  private roster: PersonRecord[];
  private limits: {
    newsapi: { used: number; cap: number };
    newsdata: { used: number; cap: number };
  };
  private isStorageEnabled: boolean;

  constructor() {
    this.newsapiClient = new NewsAPIClient();
    this.newsdataClient = new NewsDataClient();
    
    // Load roster with error handling
    try {
      this.roster = this.loadRoster();
    } catch (error: any) {
      console.error('Failed to initialize orchestrator due to roster loading error:', error.message);
      this.roster = [];
      // Don't throw here - let the orchestrator be created but with empty roster
    }
    
    this.limits = {
      newsapi: { used: 0, cap: 80 },
      newsdata: { used: 0, cap: 160 }
    };
    
    // Initialize BlobStore only if environment variables are available
    try {
      this.blobStore = new BlobStore();
      this.isStorageEnabled = true;
    } catch (error: any) {
      console.warn('BlobStore initialization failed:', error.message);
      this.blobStore = null;
      this.isStorageEnabled = false;
    }
    
    // Reset limits at UTC day boundary
    this.scheduleLimitReset();
  }

  private loadRoster(): PersonRecord[] {
    try {
      const rosterPath = process.env.ROSTER_PATH || path.join(__dirname, '../../data/ab-roster-transformed.json');
      if (!fs.existsSync(rosterPath)) {
        throw new Error(`Roster file not found at path: ${rosterPath}`);
      }
      const rosterData = fs.readFileSync(rosterPath, 'utf8');
      const allRoster = JSON.parse(rosterData);
      
      // Filter for active representatives (current MPs/MLAs/Mayors)
      // Since there's no explicit active field, we'll consider all current representatives as active
      // This can be enhanced later with more sophisticated filtering logic
      const activeRoster = allRoster.filter((person: PersonRecord) => {
        // For now, consider all representatives as active
        // This can be enhanced with logic to filter out retired, resigned, etc.
        return person && person.slug && person.fullName;
      });
      
      console.log(`[ROSTER] Loaded ${activeRoster.length} active representatives from ${rosterPath}`);
      return activeRoster;
    } catch (error) {
      console.error('Failed to load roster:', error);
      throw new Error(`Roster loading failed: ${error}`);
    }
  }

  private scheduleLimitReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    
    const timeUntilReset = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetLimits();
      this.scheduleLimitReset(); // Schedule next reset
    }, timeUntilReset);
  }

  private resetLimits(): void {
    this.limits.newsapi.used = 0;
    this.limits.newsdata.used = 0;
    console.log('News provider limits reset for new UTC day');
  }

  private checkBudget(provider: 'newsapi' | 'newsdata'): boolean {
    const limit = this.limits[provider];
    if (limit.used >= limit.cap) {
      console.log(`${provider} budget exhausted: ${limit.used}/${limit.cap}`);
      return false;
    }
    
    if (limit.used >= limit.cap * 0.8) {
      console.log(`${provider} budget warning: ${limit.used}/${limit.cap} (80%)`);
    }
    
    return true;
  }

  private incrementUsage(provider: 'newsapi' | 'newsdata'): void {
    this.limits[provider].used++;
  }

  async ingestOne(slug: string, windowDays: number): Promise<IngestSummary> {
    const runId = this.isStorageEnabled && this.blobStore ? 
      this.blobStore.generateRunId() :
      new Date().toISOString().replace(/[:.]/g, '-');

    console.log(`[INGEST] Starting ingest for ${slug}, runId: ${runId}, storageEnabled: ${this.isStorageEnabled}`);

    try {
      // Use the already loaded roster
      const person = this.roster.find((p: any) => p.slug === slug);
      
      if (!person) {
        throw new Error(`Person with slug '${slug}' not found in roster`);
      }

      console.log(`[INGEST] Found person: ${person.fullName} (${person.office})`);

      // Check budgets
      if (this.newsapiClient.isEnabled() && this.checkBudget('newsapi')) {
        if (this.limits.newsapi.used >= this.limits.newsapi.cap) {
          console.log(`[INGEST] NewsAPI budget exhausted: ${this.limits.newsapi.used}/${this.limits.newsapi.cap}`);
        }
      }
      if (this.newsdataClient.isEnabled() && this.checkBudget('newsdata')) {
        if (this.limits.newsdata.used >= this.limits.newsdata.cap) {
          console.log(`[INGEST] NewsData budget exhausted: ${this.limits.newsdata.used}/${this.limits.newsdata.cap}`);
        }
      }

      // Fetch from NewsAPI
      let newsapiResult: any = { articles: [], raw: null };
      if (this.newsapiClient.isEnabled() && this.checkBudget('newsapi')) {
        try {
          console.log(`[INGEST] Fetching from NewsAPI for ${slug}`);
          newsapiResult = await this.newsapiClient.search({
            name: person.fullName,
            aliases: person.aliases,
            riding: person.riding,
            city: person.city,
            windowDays,
            pageSize: 100,
            slug: slug
          });
          console.log(`[INGEST] NewsAPI returned ${newsapiResult?.normalized?.length || 0} articles`);
          
          if (newsapiResult?.normalized?.length > 0) {
            this.incrementUsage('newsapi');
            console.log(`[INGEST] NewsAPI budget updated: ${this.limits.newsapi.used}/${this.limits.newsapi.cap}`);
          }
        } catch (error: any) {
          console.error(`[INGEST] NewsAPI error for ${slug}:`, error.message);
        }
      }

      // Fetch from NewsData
      let newsdataResult: any = { articles: [], raw: null };
      if (process.env.ENABLE_NEWSDATA === "true" && this.newsdataClient.isEnabled() && this.checkBudget('newsdata')) {
        try {
          console.log(`[INGEST] Fetching from NewsData for ${slug}`);
          newsdataResult = await this.newsdataClient.search({
            name: person.fullName,
            aliases: person.aliases,
            riding: person.riding,
            city: person.city,
            windowDays,
            pageSize: 100,
            slug: slug
          });
          console.log(`[INGEST] NewsData returned ${newsdataResult?.normalized?.length || 0} articles`);
          
          if (newsdataResult?.normalized?.length > 0) {
            this.incrementUsage('newsdata');
            console.log(`[INGEST] NewsData budget updated: ${this.limits.newsdata.used}/${this.limits.newsdata.cap}`);
          }
        } catch (error: any) {
          console.error(`[INGEST] NewsData error for ${slug}:`, error.message);
        }
      } else {
        console.log(`[INGEST] NewsData skipped: ENABLE_NEWSDATA=${process.env.ENABLE_NEWSDATA}, enabled=${this.newsdataClient.isEnabled()}, budget=${this.checkBudget('newsdata')}`);
      }

      // Combine and normalize articles with safety checks
      const A = Array.isArray(newsdataResult?.normalized) ? newsdataResult.normalized : [];
      const B = Array.isArray(newsapiResult?.normalized) ? newsapiResult.normalized : [];
      const allArticles = [...A, ...B];
      console.log(`[INGEST] Combined ${allArticles.length} articles from both providers`);

      // Deduplicate by URL
      const uniqueArticles = this.deduplicateArticles(allArticles);
      console.log(`[INGEST] After deduplication: ${uniqueArticles.length} unique articles`);

      // Filter for separation-related content only
      const separationTerms = ["separation", "independence", "sovereignty", "referendum", "secede"];
      const relevantArticles = uniqueArticles.filter(article => {
        const searchText = `${article.title || ''} ${article.description || ''} ${article.content || ''}`.toLowerCase();
        return separationTerms.some(term => searchText.includes(term));
      });
      console.log(`[INGEST] After separation filter: ${relevantArticles.length} relevant articles`);

      // Early return if no relevant articles found
      if (relevantArticles.length === 0) {
        console.log(`[INGEST] No relevant articles found for ${slug}, returning empty result`);
        return {
          runId,
          slug,
          windowDays,
          counts: {
            requested: 1,
            normalized: allArticles.length,
            newSaved: 0,
            dupSkipped: 0
          },
          sources: {
            newsapi: { requests: 1, normCount: newsapiResult?.normalized?.length || 0 },
            newsdata: { requests: 1, normCount: newsdataResult?.normalized?.length || 0 }
          },
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          errors: []
        };
      }

      // Store individual normalized articles
      let newSaved = 0;
      let dupSkipped = 0;
      
      if (this.isStorageEnabled && this.blobStore && !process.env.DRY_RUN) {
        for (const article of relevantArticles) {
          try {
            if (!article.url || !article.url.trim()) {
              console.log(`[INGEST] Skipping article without URL: ${article.title || 'untitled'}`);
              continue;
            }
            
            const blobPath = this.blobStore.buildArticleBlobPath(slug, article.url);
            
            // Check if blob already exists
            const exists = await this.blobStore.exists(this.blobStore.getContainerName(), blobPath);
            if (exists) {
              console.log(`[INGEST] Blob already exists: ${blobPath}`);
              dupSkipped++;
              continue;
            }
            
            // Prepare article data with metadata
            const articleData = {
              ...article,
              provider: article.source?.name || 'unknown',
              fetchedAt: new Date().toISOString(),
              slug: slug,
              runId: runId
            };
            
            // Write to blob storage
            await this.blobStore.writeJson(this.blobStore.getContainerName(), blobPath, articleData);
            console.log(`[INGEST] Saved article: ${blobPath}`);
            newSaved++;
            
          } catch (error: any) {
            console.error(`[INGEST] Failed to save article:`, error.message);
          }
        }
        
        console.log(`[INGEST] Article storage complete: ${newSaved} new, ${dupSkipped} duplicates`);
      }

      // Store raw provider responses
      if (newsapiResult.raw && this.isStorageEnabled && this.blobStore && !process.env.DRY_RUN) {
        try {
          console.log(`[INGEST] Storing NewsAPI raw response for ${slug}`);
          const newsapiPath = this.blobStore.buildRawBlobPath(slug, 'newsapi', this.blobStore.generateTimestamp());
          await this.blobStore.writeJson('articles', newsapiPath, newsapiResult.raw);
          console.log(`[INGEST] NewsAPI raw response stored at: ${newsapiPath}`);
        } catch (error: any) {
          console.error(`[INGEST] Failed to store NewsAPI raw response for ${slug}:`, error.message);
        }
      }

      if (newsdataResult.raw && this.isStorageEnabled && this.blobStore && !process.env.DRY_RUN) {
        try {
          console.log(`[INGEST] Storing NewsData raw response for ${slug}`);
          const newsdataPath = this.blobStore.buildRawBlobPath(slug, 'newsdata', this.blobStore.generateTimestamp());
          await this.blobStore.writeJson('articles', newsdataPath, newsdataResult.raw);
          console.log(`[INGEST] NewsData raw response stored at: ${newsdataPath}`);
        } catch (error: any) {
          console.error(`[INGEST] Failed to store NewsData raw response for ${slug}:`, error.message);
        }
      }

      // Store summary
      if (this.isStorageEnabled && this.blobStore && !process.env.DRY_RUN) {
        try {
          console.log(`[INGEST] Storing summary for ${slug}`);
          const summary = {
            runId,
            slug,
            windowDays,
            counts: {
              requested: 1,
              normalized: allArticles.length,
              newSaved: newSaved,
              dupSkipped: dupSkipped
            },
            sources: {
              newsapi: { requests: 1, normCount: newsapiResult?.normalized?.length || 0 },
              newsdata: { requests: 1, normCount: newsdataResult?.normalized?.length || 0 }
            },
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            errors: []
          };

          const summaryPath = this.blobStore.buildSummaryBlobPath(slug, runId);
          await this.blobStore.writeJson('articles', summaryPath, summary);
          console.log(`[INGEST] Summary stored at: ${summaryPath}`);
        } catch (error: any) {
          console.error(`[INGEST] Failed to store summary for ${slug}:`, error.message);
        }
      }

      console.log(`[INGEST] Completed ingest for ${slug}: ${relevantArticles.length} articles`);

      return {
        runId,
        slug,
        windowDays,
        counts: {
          requested: 1,
          normalized: allArticles.length,
          newSaved: newSaved,
          dupSkipped: dupSkipped
        },
        sources: {
          newsapi: { requests: 1, normCount: newsapiResult?.normalized?.length || 0 },
          newsdata: { requests: 1, normCount: newsdataResult?.normalized?.length || 0 }
        },
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        errors: []
      };

    } catch (error: any) {
      console.error(`[INGEST] Error ingesting ${slug}:`, error.message);
      throw error;
    }
  }

  async ingestBatch(params: { slugs: string[]; windowDays: number; concurrency: number; dryRun?: boolean }): Promise<BatchResult> {
    const runId = this.isStorageEnabled && this.blobStore ? 
      this.blobStore.generateRunId() : 
      new Date().toISOString().replace(/[:.]/g, '-');
    const startedAt = new Date().toISOString();
    
    console.log(`Starting batch ingest: ${params.slugs.length} slugs, concurrency: ${params.concurrency}, dryRun: ${params.dryRun}`);
    
    if (params.dryRun) {
      process.env.DRY_RUN = 'true';
    }

    const results: IngestSummary[] = [];
    const errors: string[] = [];
    
    // Process slugs with concurrency limit
    for (let i = 0; i < params.slugs.length; i += params.concurrency) {
      const batch = params.slugs.slice(i, i + params.concurrency);
      const batchPromises = batch.map(slug => this.ingestOne(slug, params.windowDays));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        const errorMsg = `Batch error for slugs ${batch.join(',')}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Calculate totals
    const totals = {
      requested: results.reduce((sum, r) => sum + r.counts.requested, 0),
      normalized: results.reduce((sum, r) => sum + r.counts.normalized, 0),
      newSaved: results.reduce((sum, r) => sum + r.counts.newSaved, 0),
      dupSkipped: results.reduce((sum, r) => sum + r.counts.dupSkipped, 0),
      errors: errors.length
    };

    const batchResult: BatchResult = {
      runId,
      totals,
      limits: {
        newsapi: { 
          used: this.limits.newsapi.used, 
          cap: this.limits.newsapi.cap,
          exhausted: this.limits.newsapi.used >= this.limits.newsapi.cap
        },
        newsdata: { 
          used: this.limits.newsdata.used, 
          cap: this.limits.newsdata.cap,
          exhausted: this.limits.newsdata.used >= this.limits.newsdata.cap
        }
      },
      slugResults: results
    };

    if (params.dryRun) {
      delete process.env.DRY_RUN;
    }

    console.log(`Completed batch ingest: runId: ${runId}, totals:`, totals);
    
    return batchResult;
  }

  /**
   * Deduplicate articles by URL
   */
  private deduplicateArticles(articles: any[]): any[] {
    const urlSet = new Set<string>();
    return articles.filter(article => {
      const urlLower = article.url.toLowerCase();
      if (urlSet.has(urlLower)) {
        return false;
      }
      urlSet.add(urlLower);
      return true;
    });
  }

  /**
   * Retrieve articles for a specific slug from storage
   */
  async getArticlesBySlug(slug: string): Promise<any[]> {
    if (!this.isStorageEnabled || !this.blobStore) {
      throw new Error('Storage not available');
    }

    try {
      // Get today's date for the blob path
      const today = new Date();
      const datePath = today.toISOString().split('T')[0].replace(/-/g, '/');
      
      // Try to get articles from the ingest path first
      const ingestPath = `articles/ingest/${datePath}/${slug}`;
      
      // List blobs in the slug directory
      const blobs = await this.blobStore.listBlobs(ingestPath);
      
      const articles: any[] = [];
      
      for (const blob of blobs) {
        try {
          // Read the blob content
          const content = await this.blobStore.readJson(blob.name);
          
          if (content && content.articles) {
            // If it's a provider response with articles array
            articles.push(...content.articles);
          } else if (content && content.title) {
            // If it's a single article
            articles.push(content);
          }
        } catch (readError) {
          console.warn(`Failed to read blob ${blob.name}:`, readError);
        }
      }
      
      return articles;
      
    } catch (error: any) {
      console.error(`Error retrieving articles for ${slug}:`, error);
      throw new Error(`Failed to retrieve articles: ${error.message}`);
    }
  }

  getStatus() {
    return {
      providers: {
        newsapi: this.newsapiClient.isEnabled() ? 'active' : 'disabled',
        newsdata: this.newsdataClient.isEnabled() ? 'active' : 'disabled'
      },
      budgets: {
        newsapi: { used: this.limits.newsapi.used, cap: this.limits.newsapi.cap },
        newsdata: { used: this.limits.newsdata.used, cap: this.limits.newsdata.cap }
      },
      roster: {
        size: this.roster.length,
        cohort: 'ab-all'
      },
      storage: {
        enabled: this.isStorageEnabled
      }
    };
  }

  getRosterInfo(): { total: number; path: string; loaded: boolean } {
    return {
      total: this.roster.length,
      path: process.env.ROSTER_PATH || path.join(__dirname, '../../data/ab-roster-transformed.json'),
      loaded: this.roster.length > 0
    };
  }

  getRoster(): PersonRecord[] {
    return this.roster;
  }

  getBlobStore(): BlobStore | null {
    return this.blobStore;
  }
} 