const { BlobServiceClient } = require('@azure/storage-blob');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

// Model configuration as specified in PRD
const MODELS = {
  AGENT1_MODEL: "gpt-5-nano",
  AGENT2_MODEL: "gpt-5-mini", 
  AGENT3_MODEL: "gpt-5-mini",
  BACKUP_AGENT1: "claude-3.5-haiku",
  BACKUP_AGENT2: "claude-3.7-sonnet",
  BACKUP_AGENT3: "claude-3.7-sonnet"
};

class SentimentAnalyzer {
  constructor() {
    // Initialize Azure Storage connection (optional for testing)
    const connectionString = process.env.AZURE_STORAGE_CONNECTION;
    if (connectionString) {
      try {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        this.containerName = process.env.ARTICLES_CONTAINER || 'articles';
        console.log('Azure Storage client initialized');
      } catch (error) {
        console.warn('Warning: Failed to initialize Azure Storage client:', error.message);
        this.blobServiceClient = null;
      }
    } else {
      console.log('Warning: AZURE_STORAGE_CONNECTION not set - Azure features disabled');
      this.blobServiceClient = null;
    }
    
    // Initialize AI clients
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      console.log('OpenAI client initialized');
    } else {
      console.log('Warning: OPENAI_API_KEY not found');
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      console.log('Anthropic client initialized');
    } else {
      console.log('Warning: ANTHROPIC_API_KEY not found');
    }
  }

  async analyzeArticle(articleText, politicianName) {
    console.log(`Analyzing article for ${politicianName}`);
    
    try {
      // Agent 1: Relevance Gate
      const agent1Result = await this.agent1Check(articleText, politicianName);
      console.log(`Agent 1 result: ${agent1Result.passed ? 'PASSED' : 'FAILED'}`);
      
      if (!agent1Result.passed) {
        return {
          articleId: this.generateArticleId(articleText),
          politician: politicianName,
          processedAt: new Date().toISOString(),
          agent1: agent1Result,
          agent2: null,
          agent3: null,
          final: {
            score: null,
            classification: 'Filtered Out',
            evidence: null,
            flaggedForReview: false,
            reviewReason: 'Failed relevance gate'
          }
        };
      }
      
      // Agent 2: Stance Scoring
      const agent2Result = await this.agent2Score(articleText, politicianName);
      console.log(`Agent 2 score: ${agent2Result.stanceScore}`);
      
      // Agent 3: Verification
      const agent3Result = await this.agent3Score(articleText, politicianName);
      console.log(`Agent 3 score: ${agent3Result.stanceScore}`);
      
      // Compare scores and determine final result
      const finalResult = this.compareScores(agent2Result, agent3Result);
      
      return {
        articleId: this.generateArticleId(articleText),
        politician: politicianName,
        processedAt: new Date().toISOString(),
        agent1: agent1Result,
        agent2: agent2Result,
        agent3: agent3Result,
        final: finalResult
      };
      
    } catch (error) {
      console.error(`Error analyzing article for ${politicianName}:`, error.message);
      throw error;
    }
  }

  async agent1Check(articleText, politicianName) {
    // TODO: Implement real AI prompt in Step 2
    // For now, return mock data as placeholder
    return {
      passed: true,
      hasStance: true,
      internalScore: 85
    };
  }

  async agent2Score(articleText, politicianName) {
    // TODO: Implement real AI prompt in Step 3
    // For now, return mock data as placeholder
    return {
      stanceScore: 75,
      confidence: 0.85,
      evidence: "Mock evidence - will be replaced with real AI analysis",
      avoidedAnswering: false,
      classification: "Clear Pro-Canada"
    };
  }

  async agent3Score(articleText, politicianName) {
    // TODO: Implement real AI prompt in Step 4
    // For now, return mock data as placeholder
    return {
      stanceScore: 78,
      confidence: 0.80,
      evidence: "Mock evidence - will be replaced with real AI analysis",
      avoidedAnswering: false,
      classification: "Clear Pro-Canada"
    };
  }

  compareScores(agent2Result, agent3Result) {
    const scoreDiff = Math.abs(agent2Result.stanceScore - agent3Result.stanceScore);
    const agreement = scoreDiff <= 20;
    
    const finalScore = agreement 
      ? (agent2Result.stanceScore + agent3Result.stanceScore) / 2
      : null;
    
    return {
      score: finalScore,
      classification: finalScore ? this.getClassification(finalScore) : 'Disagreement',
      evidence: agent2Result.evidence,
      flaggedForReview: !agreement,
      reviewReason: agreement ? null : `Score disagreement: ${scoreDiff} points`
    };
  }

  getClassification(score) {
    if (score >= 90) return 'Explicitly Strong Pro-Canada';
    if (score >= 70) return 'Clear Pro-Canada';
    if (score >= 60) return 'Moderate Pro-Canada';
    if (score >= 50) return 'Neutral/Avoided';
    if (score >= 40) return 'Soft Pro-Separation';
    if (score >= 20) return 'Clear Pro-Separation';
    return 'Strong Pro-Separation';
  }

  generateArticleId(text) {
    // Simple hash for now - will be replaced with proper SHA256 in production
    return `article_${Date.now()}_${text.length}`;
  }

  async readArticlesFromStorage(politicianSlug, limit = 19) {
    console.log(`Reading articles for ${politicianSlug} from Azure Blob Storage`);
    
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const pathPrefix = `raw/serp/${politicianSlug}/`;
      
      const articles = [];
      const listOptions = { prefix: pathPrefix };
      
      for await (const blob of containerClient.listBlobsFlat(listOptions)) {
        if (articles.length >= limit) break;
        
        const blobClient = containerClient.getBlobClient(blob.name);
        const downloadResponse = await blobClient.download();
        const content = await this.streamToString(downloadResponse.readableStreamBody);
        
        try {
          const articleData = JSON.parse(content);
          articles.push({
            filename: blob.name,
            content: articleData,
            size: blob.properties.contentLength
          });
          console.log(`Loaded article: ${blob.name} (${blob.properties.contentLength} bytes)`);
        } catch (parseError) {
          console.warn(`Failed to parse JSON from ${blob.name}:`, parseError.message);
        }
      }
      
      console.log(`Successfully loaded ${articles.length} articles for ${politicianSlug}`);
      return articles;
      
    } catch (error) {
      console.error(`Error reading articles for ${politicianSlug}:`, error.message);
      throw error;
    }
  }

  async streamToString(readableStream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      readableStream.on('data', (data) => {
        chunks.push(data.toString());
      });
      readableStream.on('end', () => {
        resolve(chunks.join(''));
      });
      readableStream.on('error', reject);
    });
  }
}

module.exports = SentimentAnalyzer;
