const { BlobServiceClient } = require('@azure/storage-blob');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

// Model configuration - using actual OpenAI model names
const MODELS = {
  AGENT1_MODEL: "gpt-4o-mini",  // Nano equivalent for relevance gate
  AGENT2_MODEL: "gpt-4o",       // Mini equivalent for stance scoring
  AGENT3_MODEL: "gpt-4o",       // Mini equivalent for verification
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

  async analyzeArticle(articleData, politicianName) {
    console.log(`Analyzing article for ${politicianName}`);
    
    try {
      // Extract article text from the data structure
      const articleText = this.extractArticleText(articleData);
      console.log(`Extracted text length: ${articleText.length} characters`);
      
      // Agent 1: Relevance Gate
      const agent1Result = await this.agent1Check(articleText, politicianName);
      console.log(`Agent 1 result: ${agent1Result.passed ? 'PASSED' : 'FAILED'} (score: ${agent1Result.internalScore})`);
      
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
      
      // Agent 2: Stance Scoring (still mock for now)
      const agent2Result = await this.agent2Score(articleText, politicianName);
      console.log(`Agent 2 score: ${agent2Result.stanceScore}`);
      
      // Agent 3: Verification (still mock for now)
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
    console.log(`Agent 1: Checking relevance for ${politicianName}`);
    
    try {
      // Create relevance gate prompt as specified in PRD
      const prompt = `Does this article contain any statement from ${politicianName} about Alberta's relationship with Canada, including views on unity, separation, federalism, or independence?

Article text: "${articleText}"

Please analyze this article and respond with a JSON object containing:
- "passed": true if the article contains ANY stance from ${politicianName} about Alberta-Canada relationship, false otherwise
- "internalScore": a number from 0-100 indicating how clearly the stance is expressed (0=no stance, 100=very clear stance)
- "reason": a brief explanation (max 50 words) of why this article passed or failed the relevance gate

Focus on detecting ANY mention of:
- Separation/independence (for or against)
- Federalism, confederation, unity
- Alberta-Ottawa relations
- "Fair deal", autonomy, sovereignty
- Economic statements implying need for Canada
- Defensive statements about separation

Respond with ONLY valid JSON, no other text.`;

      // Try OpenAI first
      if (this.openai) {
        try {
          const response = await this.openai.chat.completions.create({
            model: MODELS.AGENT1_MODEL,
            messages: [
              {
                role: "system",
                content: "You are a relevance gate agent that determines if articles contain political stances about Alberta's relationship with Canada. Respond with ONLY valid JSON."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0, // For consistency
            max_tokens: 200
          });

          const content = response.choices[0].message.content.trim();
          console.log(`OpenAI response: ${content}`);
          
          // Parse JSON response
          const result = JSON.parse(content);
          
          // Validate required fields
          if (typeof result.passed === 'boolean' && 
              typeof result.internalScore === 'number' && 
              typeof result.reason === 'string') {
            return {
              passed: result.passed,
              hasStance: result.passed,
              internalScore: result.internalScore,
              reason: result.reason
            };
          } else {
            throw new Error('Invalid response format from OpenAI');
          }
          
        } catch (openaiError) {
          console.warn(`OpenAI failed, trying Anthropic: ${openaiError.message}`);
          throw openaiError; // Let fallback handle it
        }
      }
      
      // Fallback to Anthropic if OpenAI fails
      if (this.anthropic) {
        try {
          const response = await this.anthropic.messages.create({
            model: MODELS.BACKUP_AGENT1,
            max_tokens: 200,
            messages: [
              {
                role: "user",
                content: prompt
              }
            ]
          });

          const content = response.content[0].text.trim();
          console.log(`Anthropic response: ${content}`);
          
          // Parse JSON response
          const result = JSON.parse(content);
          
          // Validate required fields
          if (typeof result.passed === 'boolean' && 
              typeof result.internalScore === 'number' && 
              typeof result.reason === 'string') {
            return {
              passed: result.passed,
              hasStance: result.passed,
              internalScore: result.internalScore,
              reason: result.reason
            };
          } else {
            throw new Error('Invalid response format from Anthropic');
          }
          
        } catch (anthropicError) {
          console.error(`Both AI providers failed: ${anthropicError.message}`);
          throw new Error(`AI analysis failed: ${anthropicError.message}`);
        }
      }
      
      // If no AI providers available, throw error
      throw new Error('No AI providers configured');
      
    } catch (error) {
      console.error(`Agent 1 error for ${politicianName}:`, error.message);
      
      // Return safe fallback on error
      return {
        passed: false,
        hasStance: false,
        internalScore: 0,
        reason: `Error during analysis: ${error.message}`
      };
    }
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

  extractArticleText(articleData) {
    // Extract article text from SERPHouse JSON structure
    // Handle different possible formats from SERPHouse API
    try {
      if (typeof articleData === 'string') {
        return articleData; // Already text
      }
      
      if (articleData && typeof articleData === 'object') {
        // Try to find article text in various possible locations
        const possibleTextFields = [
          articleData.title,
          articleData.snippet,
          articleData.description,
          articleData.content,
          articleData.text
        ];
        
        // Find first non-empty text field
        for (const field of possibleTextFields) {
          if (field && typeof field === 'string' && field.trim().length > 0) {
            return field.trim();
          }
        }
        
        // If no direct text fields, try to extract from nested structures
        if (articleData.articles && Array.isArray(articleData.articles)) {
          // SERPHouse might return articles array
          const firstArticle = articleData.articles[0];
          if (firstArticle) {
            return this.extractArticleText(firstArticle);
          }
        }
        
        // Last resort: stringify the whole object
        return JSON.stringify(articleData);
      }
      
      return String(articleData);
      
    } catch (error) {
      console.warn('Error extracting article text:', error.message);
      return String(articleData);
    }
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

  async testAgent1(articleText, politicianName) {
    console.log(`\n=== Testing Agent 1 for ${politicianName} ===`);
    console.log(`Article text: "${articleText.substring(0, 100)}..."`);
    
    try {
      const result = await this.agent1Check(articleText, politicianName);
      console.log(`✅ Agent 1 test completed:`);
      console.log(`   Passed: ${result.passed}`);
      console.log(`   Internal Score: ${result.internalScore}`);
      console.log(`   Reason: ${result.reason}`);
      return result;
    } catch (error) {
      console.error(`❌ Agent 1 test failed:`, error.message);
      throw error;
    }
  }
}

module.exports = SentimentAnalyzer;
