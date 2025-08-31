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
    console.log(`Agent 2: Scoring stance for ${politicianName}`);
    
    try {
      // Create stance scoring prompt as specified in PRD
      const prompt = `Analyze this article and score ${politicianName}'s stance on Alberta's relationship with Canada from 0-100.

Article text: "${articleText}"

Scoring Framework:
- 90-100: Explicitly Strong Pro-Canada (e.g., "Alberta must remain in Canada")
- 70-89: Clear Pro-Canada (e.g., "Federation has served us well")
- 60-69: Moderate Pro-Canada (e.g., "We need Canada's support")
- 50-59: Neutral/Avoided (e.g., "Albertans will decide")
- 40-49: Soft Pro-Separation (e.g., "Alberta isn't getting fair deal")
- 20-39: Clear Pro-Separation (e.g., "Should consider referendum")
- 0-19: Strong Pro-Separation (e.g., "Independence is our only option")

Special Case: If ${politicianName} is Danielle Smith, UCP party statements = her position (as leader).

Respond with ONLY valid JSON containing:
- "stanceScore": number 0-100
- "confidence": number 0-1 (how confident in the score)
- "evidence": string (max 50 words explaining the score)
- "avoidedAnswering": boolean (true if politician avoided the question)
- "classification": string (one of the classifications above)`;

      // Try OpenAI first
      if (this.openai) {
        try {
          const response = await this.openai.chat.completions.create({
            model: MODELS.AGENT2_MODEL,
            messages: [
              {
                role: "system",
                content: "You are a stance scoring agent that analyzes political positions on Alberta-Canada relations. Respond with ONLY valid JSON."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0, // For consistency
            max_tokens: 300
          });

          const content = response.choices[0].message.content.trim();
          console.log(`OpenAI Agent 2 response: ${content}`);
          
          // Parse JSON response
          const result = JSON.parse(content);
          
          // Validate required fields
          if (typeof result.stanceScore === 'number' && 
              typeof result.confidence === 'number' && 
              typeof result.evidence === 'string' &&
              typeof result.avoidedAnswering === 'boolean' &&
              typeof result.classification === 'string') {
            return result;
          } else {
            throw new Error('Invalid response format from OpenAI Agent 2');
          }
          
        } catch (openaiError) {
          console.warn(`OpenAI Agent 2 failed, trying Anthropic: ${openaiError.message}`);
          throw openaiError; // Let fallback handle it
        }
      }
      
      // Fallback to Anthropic if OpenAI fails
      if (this.anthropic) {
        try {
          const response = await this.anthropic.messages.create({
            model: MODELS.BACKUP_AGENT2,
            max_tokens: 300,
            messages: [
              {
                role: "user",
                content: prompt
              }
            ]
          });

          const content = response.content[0].text.trim();
          console.log(`Anthropic Agent 2 response: ${content}`);
          
          // Parse JSON response
          const result = JSON.parse(content);
          
          // Validate required fields
          if (typeof result.stanceScore === 'number' && 
              typeof result.confidence === 'number' && 
              typeof result.evidence === 'string' &&
              typeof result.avoidedAnswering === 'boolean' &&
              typeof result.classification === 'string') {
            return result;
          } else {
            throw new Error('Invalid response format from Anthropic Agent 2');
          }
          
        } catch (anthropicError) {
          console.error(`Both AI providers failed for Agent 2: ${anthropicError.message}`);
          throw new Error(`AI analysis failed for Agent 2: ${anthropicError.message}`);
        }
      }
      
      // If no AI providers available, throw error
      throw new Error('No AI providers configured for Agent 2');
      
    } catch (error) {
      console.error(`Agent 2 error for ${politicianName}:`, error.message);
      
      // Return safe fallback on error
      return {
        stanceScore: 50,
        confidence: 0.0,
        evidence: `Error during analysis: ${error.message}`,
        avoidedAnswering: true,
        classification: 'Error'
      };
    }
  }

  async agent3Score(articleText, politicianName) {
    console.log(`Agent 3: Verifying stance for ${politicianName}`);
    
    try {
      // Create verification prompt (different wording from Agent 2)
      const prompt = `Independently assess ${politicianName}'s position on Alberta's relationship with Canada and provide a score from 0-100.

Article text: "${articleText}"

Evaluation Criteria:
- 90-100: Strongly Pro-Canada (explicit support for federation)
- 70-89: Pro-Canada (positive view of Canadian unity)
- 60-69: Moderately Pro-Canada (acknowledges benefits of federation)
- 50-59: Neutral/Unclear (avoids taking clear position)
- 40-49: Somewhat Pro-Separation (expresses concerns about federal relationship)
- 20-39: Pro-Separation (supports greater autonomy or separation)
- 0-19: Strongly Pro-Separation (explicit support for independence)

Note: For Danielle Smith, consider UCP party positions as representing her views as party leader.

Provide ONLY valid JSON with:
- "stanceScore": number 0-100
- "confidence": number 0-1 (certainty level)
- "evidence": string (max 50 words supporting the score)
- "avoidedAnswering": boolean (true if position unclear)
- "classification": string (matching one of the categories above)`;

      // Try OpenAI first
      if (this.openai) {
        try {
          const response = await this.openai.chat.completions.create({
            model: MODELS.AGENT3_MODEL,
            messages: [
              {
                role: "system",
                content: "You are an independent verification agent for political stance analysis. Provide unbiased assessment with ONLY valid JSON."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0, // For consistency
            max_tokens: 300
          });

          const content = response.choices[0].message.content.trim();
          console.log(`OpenAI Agent 3 response: ${content}`);
          
          // Parse JSON response
          const result = JSON.parse(content);
          
          // Validate required fields
          if (typeof result.stanceScore === 'number' && 
              typeof result.confidence === 'number' && 
              typeof result.evidence === 'string' &&
              typeof result.avoidedAnswering === 'boolean' &&
              typeof result.classification === 'string') {
            return result;
          } else {
            throw new Error('Invalid response format from OpenAI Agent 3');
          }
          
        } catch (openaiError) {
          console.warn(`OpenAI Agent 3 failed, trying Anthropic: ${openaiError.message}`);
          throw openaiError; // Let fallback handle it
        }
      }
      
      // Fallback to Anthropic if OpenAI fails
      if (this.anthropic) {
        try {
          const response = await this.anthropic.messages.create({
            model: MODELS.BACKUP_AGENT3,
            max_tokens: 300,
            messages: [
              {
                role: "user",
                content: prompt
              }
            ]
          });

          const content = response.content[0].text.trim();
          console.log(`Anthropic Agent 3 response: ${content}`);
          
          // Parse JSON response
          const result = JSON.parse(content);
          
          // Validate required fields
          if (typeof result.stanceScore === 'number' && 
              typeof result.confidence === 'number' && 
              typeof result.evidence === 'string' &&
              typeof result.avoidedAnswering === 'boolean' &&
              typeof result.classification === 'string') {
            return result;
          } else {
            throw new Error('Invalid response format from Anthropic Agent 3');
          }
          
        } catch (anthropicError) {
          console.error(`Both AI providers failed for Agent 3: ${anthropicError.message}`);
          throw new Error(`AI analysis failed for Agent 3: ${anthropicError.message}`);
        }
      }
      
      // If no AI providers available, throw error
      throw new Error('No AI providers configured for Agent 3');
      
    } catch (error) {
      console.error(`Agent 3 error for ${politicianName}:`, error.message);
      
      // Return safe fallback on error
      return {
        stanceScore: 50,
        confidence: 0.0,
        evidence: `Error during analysis: ${error.message}`,
        avoidedAnswering: true,
        classification: 'Error'
      };
    }
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
