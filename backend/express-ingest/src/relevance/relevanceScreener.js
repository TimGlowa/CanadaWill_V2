const { BlobServiceClient } = require('@azure/storage-blob');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class RelevanceScreener {
  constructor() {
    // Initialize Azure Storage connection
    const connectionString = process.env.AZURE_STORAGE_CONNECTION;
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION environment variable is required');
    }
    
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerName = process.env.ARTICLES_CONTAINER || 'news';
    
    // Ensure container exists
    this.ensureContainerExists();
    
    // Initialize OpenAI client
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Initialize append blob clients for outputs
    this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    this.csvAppendBlob = this.containerClient.getAppendBlobClient('analysis/master_relevance.csv');
    this.jsonlAppendBlob = this.containerClient.getAppendBlobClient('analysis/master_relevance.jsonl');
    
    // In-memory status (no filesystem writes)
    this.currentStatus = null;
    
    console.log('RelevanceScreener initialized with append blob clients');
  }

  async ensureContainerExists() {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      await containerClient.createIfNotExists();
      console.log(`✅ Container '${this.containerName}' exists or created`);
    } catch (error) {
      console.warn(`Warning: Could not ensure container '${this.containerName}' exists:`, error.message);
    }
  }

  async ensureAppendBlobsExist() {
    try {
      // Create append blobs if they don't exist
      await this.csvAppendBlob.createIfNotExists();
      await this.jsonlAppendBlob.createIfNotExists();
      
      // Check if CSV needs header (get blob properties to see if it's empty)
      const csvProperties = await this.csvAppendBlob.getProperties();
      if (csvProperties.contentLength === 0) {
        const csvHeader = "row_id,run_id,person_name,date,article_title,snippet,url,relevance_score,relevant,ties_to_politician,reason\n";
        await this.csvAppendBlob.appendBlock(csvHeader, Buffer.byteLength(csvHeader));
        console.log(`✅ Added CSV header to ${this.csvAppendBlob.url}`);
      }
      
      console.log(`✅ Append blobs ready: CSV (${csvProperties.contentLength} bytes), JSONL`);
    } catch (error) {
      console.error(`❌ Failed to ensure append blobs exist:`, error.message);
      throw error;
    }
  }

  async startRelevanceScreening(testMode = false, testLimit = 10) {
    const runId = new Date().toISOString();
    const mode = testMode ? 'TEST' : 'FULL';
    console.log(`🚀 Starting ${mode} relevance screening run: ${runId}`);
    
    try {
      // Ensure append blobs exist
      await this.ensureAppendBlobsExist();
      
      // Initialize in-memory status
      const status = {
        run_id: runId,
        total: 0,
        processed: 0,
        pending: 0,
        errors: 0,
        last_row: null,
        startedAt: runId,
        updatedAt: runId,
        testMode: testMode,
        testLimit: testLimit
      };
      
      // Store status in memory
      this.currentStatus = status;
      
      // Load existing processed row_ids for resume capability
      const processedRowIds = await this.loadProcessedRowIds();
      console.log(`📋 Found ${processedRowIds.size} already processed articles`);
      
      // Discover all blob files
      const blobFiles = await this.discoverBlobFiles();
      console.log(`📁 Found ${blobFiles.length} blob files to process`);
      
      if (testMode) {
        console.log(`🧪 TEST MODE: Processing only first ${testLimit} articles`);
        blobFiles.length = Math.min(blobFiles.length, 1); // Only process first blob file in test mode
      }
      
      // Calculate total articles
      let totalArticles = 0;
      for (const blobFile of blobFiles) {
        const articleCount = await this.countArticlesInBlob(blobFile);
        if (testMode) {
          totalArticles += Math.min(articleCount, testLimit);
        } else {
          totalArticles += articleCount;
        }
      }
      
      status.total = totalArticles;
      status.pending = totalArticles - processedRowIds.size;
      await this.updateStatus(status);
      
      console.log(`📊 Total articles to process: ${status.total}, Already processed: ${processedRowIds.size}, Pending: ${status.pending}`);
      
      // Process each blob file
      for (const blobFile of blobFiles) {
        await this.processBlobFile(blobFile, processedRowIds, status, testMode, testLimit);
      }
      
      status.updatedAt = new Date().toISOString();
      await this.updateStatus(status);
      
      console.log(`✅ ${mode} relevance screening completed!`);
      console.log(`📊 Final stats: ${status.processed} processed, ${status.errors} errors`);
      
      return status;
      
    } catch (error) {
      console.error(`❌ ${mode} relevance screening failed:`, error.message);
      throw error;
    }
  }

  async loadProcessedRowIds() {
    const processedRowIds = new Set();
    
    try {
      // Load from existing CSV
      const csvPath = 'news/analysis/master_relevance.csv';
      const csvExists = await this.blobExists(csvPath);
      
      if (csvExists) {
        const csvContent = await this.downloadBlob(csvPath);
        const lines = csvContent.split('\n');
        
        // Skip header row, process data rows
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            const columns = line.split(',');
            if (columns.length > 0) {
              const rowId = columns[0].replace(/"/g, ''); // Remove quotes
              processedRowIds.add(rowId);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not load existing processed row IDs:', error.message);
    }
    
    return processedRowIds;
  }

  async discoverBlobFiles() {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blobFiles = [];
    
    console.log(`🔍 Discovering blobs in container '${this.containerName}' with prefix 'raw/serp/myles-mcdougall/'`);
    
    for await (const blob of containerClient.listBlobsFlat({ prefix: 'raw/serp/myles-mcdougall/' })) {
      console.log(`📁 Found blob: ${blob.name}`);
      if (blob.name.endsWith('.json')) {
        blobFiles.push(blob.name);
      }
    }
    
    console.log(`📊 Total JSON blobs found: ${blobFiles.length}`);
    return blobFiles;
  }

  async countArticlesInBlob(blobPath) {
    try {
      const content = await this.downloadBlob(blobPath);
      const data = JSON.parse(content);
      return data.raw ? data.raw.length : 0;
    } catch (error) {
      console.warn(`Warning: Could not count articles in ${blobPath}:`, error.message);
      return 0;
    }
  }

  async processBlobFile(blobPath, processedRowIds, status, testMode = false, testLimit = 10) {
    console.log(`📄 Processing blob file: ${blobPath}`);
    
    try {
      // Parse blob path to extract slug and filename
      const pathParts = blobPath.split('/');
      const slug = pathParts[2]; // raw/serp/{slug}/{filename}.json
      const filename = pathParts[3];
      const fileIndex = filename.replace('.json', '');
      
      // Download and parse blob content
      const content = await this.downloadBlob(blobPath);
      const data = JSON.parse(content);
      
      if (!data.raw || !Array.isArray(data.raw)) {
        console.warn(`Warning: No raw array found in ${blobPath}`);
        return;
      }
      
      const personName = data.who || 'Unknown';
      
      // In test mode, limit the number of articles processed
      const maxArticles = testMode ? Math.min(data.raw.length, testLimit) : data.raw.length;
      console.log(`📊 Processing ${maxArticles} articles from ${data.raw.length} total in file`);
      
      // Process each article in the raw array
      for (let articleIndex = 0; articleIndex < maxArticles; articleIndex++) {
        const article = data.raw[articleIndex];
        const rowId = `${slug}_${fileIndex}_${articleIndex}`;
        
        // Skip if already processed
        if (processedRowIds.has(rowId)) {
          continue;
        }
        
        try {
          // Extract fields WITH COERCION (no throws)
          const personName = String(data.who || '');
          const title = String(article.title || '');
          const snippet = String(article.snippet || '');
          const url = String(article.url || '');
          const date = article.date ? String(article.date) : '';
          
          // Log BEFORE GPT
          console.info("PRE", { 
            rowId, 
            hasTitle: !!title, 
            hasSnippet: !!snippet, 
            urlLen: url.length,
            personName,
            titlePreview: title.substring(0, 50) + "..."
          });
          
          // Extract article data
          const articleData = {
            row_id: rowId,
            run_id: status.run_id,
            person_name: personName,
            date: date,
            article_title: title,
            snippet: snippet,
            url: url
          };
          
          // Call GPT-5-mini for relevance screening
          const gptResult = await this.callGPT5Mini(personName, title, snippet);
          
          // Combine results
          const finalResult = {
            ...articleData,
            relevance_score: gptResult.relevance_score,
            relevant: gptResult.relevant,
            ties_to_politician: gptResult.ties_to_politician,
            reason: gptResult.reason
          };
          
          // Append to output files
          await this.appendToAppendBlobs(finalResult);
          
          // Update status
          status.processed++;
          status.pending--;
          status.last_row = rowId;
          status.updatedAt = new Date().toISOString();
          
          // Update status every 1000 rows
          if (status.processed % 1000 === 0) {
            await this.updateStatus(status);
            console.log(`📊 Progress: ${status.processed}/${status.total} (${((status.processed/status.total)*100).toFixed(1)}%)`);
          }
          
        } catch (error) {
          console.error(`Error processing article ${rowId}:`, error.message);
          status.errors++;
          status.updatedAt = new Date().toISOString();
        }
      }
      
    } catch (error) {
      console.error(`Error processing blob file ${blobPath}:`, error.message);
      status.errors++;
    }
  }

  async callGPT5Mini(personName, title, snippet) {
    const prompt = `Person: ${personName}
Title: ${title}
Snippet: ${snippet}

Question: Is this article about Alberta separation, independence, secession, statehood (incl. '51 state'), or remaining in Canada (any stance, even dodges)? Is it tied to this politician?

Answer ONLY in JSON:
{"relevance_score":0-100,"relevant":true|false,"ties_to_politician":true|false,"reason":"30-50 words"}`;

    let retries = 0;
    const maxRetries = 2;
    
    console.log(`🤖 Calling GPT-5-mini for: "${title}"`);
    console.log(`📝 Prompt: ${prompt.substring(0, 200)}...`);

    while (retries <= maxRetries) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-5-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        });
        
        const content = response.choices[0].message.content;
        console.log(`📤 Raw GPT-5-mini response: ${content}`);
        
        // Log RAW model output string BEFORE parsing
        console.info("RAW", { 
          rowId: `${personName}_${title.substring(0, 20)}`, 
          rawLen: content.length, 
          raw: content 
        });
        
        // Parse with guard
        let result;
        try { 
          result = JSON.parse(content);
          console.log(`✅ Successfully parsed JSON:`, result);
        } catch(e) {
          console.error("PARSE_FAIL", { 
            rowId: `${personName}_${title.substring(0, 20)}`, 
            msg: e.message, 
            raw: content 
          });
          throw e;
        }
        
        // Validate result structure
        if (typeof result.relevance_score !== 'number' || 
            typeof result.relevant !== 'boolean' || 
            typeof result.ties_to_politician !== 'boolean' || 
            typeof result.reason !== 'string') {
          throw new Error('Invalid GPT response structure');
        }
        
        return result;
        
      } catch (error) {
        retries++;
        console.error(`❌ GPT-5-mini attempt ${retries} failed for "${title}":`, error.message);
        
        if (retries > maxRetries) {
          console.error(`❌ GPT-5-mini failed after ${maxRetries} retries for ${personName}:`, error.message);
          console.error(`📤 Last raw response was logged above`);
          // Return default values on failure
          return {
            relevance_score: 0,
            relevant: false,
            ties_to_politician: false,
            reason: `GPT call failed: ${error.message}`
          };
        }
        
        // Exponential backoff
        const delay = Math.pow(2, retries) * 1000;
        console.warn(`GPT call failed, retrying in ${delay}ms (attempt ${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async appendToAppendBlobs(result) {
    // Prepare CSV row
    const csvRow = [
      result.row_id,
      result.run_id,
      result.person_name,
      result.date,
      result.article_title,
      result.snippet,
      result.url,
      result.relevance_score,
      result.relevant,
      result.ties_to_politician,
      result.reason
    ].map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(',') + '\n';
    
    // Prepare JSONL row
    const jsonlRow = JSON.stringify(result) + '\n';
    
    // Append to append blobs
    await this.csvAppendBlob.appendBlock(csvRow, Buffer.byteLength(csvRow));
    await this.jsonlAppendBlob.appendBlock(jsonlRow, Buffer.byteLength(jsonlRow));
  }

  async updateStatus(status) {
    // Update in-memory status
    this.currentStatus = status;
  }

  async getStatus() {
    return this.currentStatus || {
      run_id: null,
      total: 0,
      processed: 0,
      pending: 0,
      errors: 0,
      last_row: null,
      startedAt: null,
      updatedAt: null
    };
  }

  // Azure Blob Storage helper methods
  async blobExists(blobPath) {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blobClient = containerClient.getBlobClient(blobPath);
      await blobClient.getProperties();
      return true;
    } catch (error) {
      return false;
    }
  }

  async downloadBlob(blobPath) {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blobClient = containerClient.getBlobClient(blobPath);
    const downloadResponse = await blobClient.download();
    
    return new Promise((resolve, reject) => {
      const chunks = [];
      downloadResponse.readableStreamBody.on('data', (data) => {
        chunks.push(data.toString());
      });
      downloadResponse.readableStreamBody.on('end', () => {
        resolve(chunks.join(''));
      });
      downloadResponse.readableStreamBody.on('error', reject);
    });
  }

  async uploadBlob(blobPath, content) {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blobClient = containerClient.getBlobClient(blobPath);
    await blobClient.upload(content, content.length, {
      blobHTTPHeaders: { blobContentType: 'text/plain' }
    });
  }

  async appendToBlob(blobPath, content) {
    try {
      // For append operations, we need to download, append, and re-upload
      const existingContent = await this.downloadBlob(blobPath);
      const newContent = existingContent + content;
      await this.uploadBlob(blobPath, newContent);
    } catch (error) {
      // If blob doesn't exist, create it
      await this.uploadBlob(blobPath, content);
    }
  }
}

module.exports = RelevanceScreener;
