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
    
    // Status blob client
    this.statusBlob = this.containerClient.getBlockBlobClient('analysis/status/relevance_status.json');
    
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
      const csvProperties = await this.csvAppendBlob.getProperties().catch(() => null);
      if (!csvProperties || (csvProperties.contentLength ?? 0) === 0) {
        const csvHeader = "row_id,run_id,person_name,date,article_title,snippet,url,relevance_score,relevant,ties_to_politician,reason\n";
        await this.csvAppendBlob.appendBlock(Buffer.from(csvHeader, "utf8"), Buffer.byteLength(csvHeader, "utf8"));
        console.log(`✅ Added CSV header to ${this.csvAppendBlob.url}`);
      }
      
      console.log(`✅ Append blobs ready: CSV (${csvProperties?.contentLength || 0} bytes), JSONL`);
    } catch (error) {
      console.error(`❌ Failed to ensure append blobs exist:`, error.message);
      throw error;
    }
  }

  async startRelevanceScreening(testMode = false, testLimit = null) {
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
      
      // Store initial status in blob
      await this.updateStatus(status);
      
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
      
      // Set estimated total based on inventory (no pre-counting)
      status.total = testMode ? testLimit : 24892; // From inventory pass
      status.pending = status.total - processedRowIds.size;
      status.mode = "phaseA";
      await this.updateStatus(status);
      
      console.log(`📊 Estimated articles to process: ${status.total}, Already processed: ${processedRowIds.size}, Pending: ${status.pending}`);
      
      // Process each blob file
      for (const blobFile of blobFiles) {
        status.current_file = blobFile;
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
    
    console.log(`🔍 Discovering blobs in container '${this.containerName}' with prefix 'raw/serp/'`);
    
    for await (const blob of containerClient.listBlobsFlat({ prefix: 'raw/serp/' })) {
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

  async processBlobFile(blobPath, processedRowIds, status, testMode = false, testLimit = 10, diagMode = null) {
    console.log(`📄 Processing blob file: ${blobPath}`);
    
    try {
      // Parse blob path to extract slug and filename
      const pathParts = blobPath.split('/');
      const slug = pathParts[2]; // raw/serp/{slug}/{filename}.json
      const filename = pathParts[3];
      const fileIndex = filename.replace('.json', '');
      
      // Phase A: Download and parse blob content with timeout
      console.info("PHASE:A_PARSE_START", { slug, file: filename });
      
      const parseTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PARSE_TIMEOUT')), 10000)
      );
      
      const content = await Promise.race([
        this.downloadBlob(blobPath),
        parseTimeout
      ]);
      const data = JSON.parse(content);
      
      /** KISS instrumentation for one blob (no assumptions) **/
      
      // 1) Immediately after JSON parse:
      console.info("BLOB_OPEN", {
        slug, file: filename, // from path
        who: data?.who ?? null,
        hasRaw: Array.isArray(data?.raw),
        rawType: typeof data?.raw,
        rawLen: Array.isArray(data?.raw) ? data.raw.length : -1
      });
      
      // 2) Early guard: if no usable array, log and return (do NOT swallow silently)
      if (!Array.isArray(data?.raw) || data.raw.length === 0) {
        console.warn("STRUCT_EMPTY_OR_MISSING", { slug, file: filename });
        return;
      }
      
      // Phase A complete
      console.info("PHASE:A_PARSE_OK", { rawLen: data.raw.length });
      
      const personName = data.who || 'Unknown';
      
      // Update current slug in status
      status.current_slug = slug;
      await this.updateStatus(status);
      
      // In test mode, limit the number of articles processed
      const maxArticles = testMode ? Math.min(data.raw.length, testLimit) : data.raw.length;
      
      // 3) Before the for-loop, log the loop plan
      console.info("ITER_PLAN", {
        slug, file: filename, startIndex: 0, endIndex: maxArticles - 1
      });
      
      console.log(`📊 Processing ${maxArticles} articles from ${data.raw.length} total in file`);
      
      // Process each article in the raw array
      for (let articleIndex = 0; articleIndex < maxArticles; articleIndex++) {
        const article = data.raw[articleIndex];
        const rowId = `${slug}_${fileIndex}_${articleIndex}`;
        
        // 4) Inside the loop, first thing each iteration:
        const skip = processedRowIds.has(rowId);
        console.info("ITER_STEP", {
          row_id: rowId, i: articleIndex, skip, hasTitle: !!article?.title, hasSnippet: !!article?.snippet
        });
        if (skip) { continue; }
        
        try {
          // Extract fields WITH COERCION (no throws)
          const personName = String(data.who || '');
          const title = String(article.title || '');
          const snippet = String(article.snippet || '');
          const url = String(article.url || '');
          const date = article.date ? String(article.date) : '';
          
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
          
          let finalResult = articleData;
          
          // Diagnostic mode logic
          if (diagMode === "A_PARSE_ONLY") {
            // Mode A: Just parse, no GPT, no append
            console.info("DIAG:A_SKIP_GPT_APPEND", { row_id: rowId });
            continue;
          }
          
          if (diagMode === "B_APPEND_ONLY") {
            // Mode B: Skip GPT, build dummy result, append only
            console.info("PHASE:B_APPEND_START", { row_id: rowId });
            
            finalResult = {
              ...articleData,
              relevance_score: 0.5,
              relevant: false,
              ties_to_politician: "DIAG_MODE_B",
              reason: "Diagnostic mode B - dummy data"
            };
            
            // Append with timeout
            const appendTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('APPEND_TIMEOUT')), 10000)
            );
            
            await Promise.race([
              this.appendToAppendBlobs(finalResult),
              appendTimeout
            ]);
            
            console.info("PHASE:B_APPEND_OK", { row_id: rowId });
            
          } else if (diagMode === "C_GPT_ONLY") {
            // Mode C: Call GPT, no append
            console.info("PHASE:C_GPT_START", { row_id: rowId });
            
            // Call GPT (now has built-in timeout and retries)
            const gptResult = await this.callGPT5Mini(personName, title, snippet);
            
            finalResult = {
              ...articleData,
              relevance_score: gptResult.relevance_score,
              relevant: gptResult.relevant,
              ties_to_politician: gptResult.ties_to_politician,
              reason: gptResult.reason
            };
            
            console.info("PHASE:C_GPT_OK", { row_id: rowId });
            
          } else {
            // Normal production mode
            // Call GPT-5-mini for relevance screening
            const gptResult = await this.callGPT5Mini(personName, title, snippet);
            
            // Combine results
            finalResult = {
              ...articleData,
              relevance_score: gptResult.relevance_score,
              relevant: gptResult.relevant,
              ties_to_politician: gptResult.ties_to_politician,
              reason: gptResult.reason
            };
            
            // Append to output files
            await this.appendToAppendBlobs(finalResult);
          }
          
          // Update status
          status.processed++;
          status.pending--;
          status.last_row = rowId;
          status.updatedAt = new Date().toISOString();
          
          // Update status every 500 rows
          if (status.processed % 500 === 0) {
            await this.updateStatus(status);
            console.log(`📊 Progress: ${status.processed}/${status.total} (${((status.processed/status.total)*100).toFixed(1)}%)`);
          }
          
        } catch (error) {
          if (error.message === 'PARSE_TIMEOUT') {
            console.error("PARSE_TIMEOUT", { slug, file: filename });
            return;
          } else if (error.message === 'APPEND_TIMEOUT') {
            console.error("APPEND_TIMEOUT", { row_id: rowId });
            status.errors++;
            status.updatedAt = new Date().toISOString();
          } else if (error.message === 'GPT_TIMEOUT') {
            console.error("GPT_TIMEOUT", { row_id: rowId });
            status.errors++;
            status.updatedAt = new Date().toISOString();
          } else {
            console.error(`Error processing article ${rowId}:`, error.message);
            status.errors++;
            status.updatedAt = new Date().toISOString();
          }
        }
      }
      
    } catch (error) {
      console.error(`Error processing blob file ${blobPath}:`, error.message);
      status.errors++;
    }
  }

  async callGPT5Mini(personName, title, snippet) {
    const MODEL = "gpt-5-mini";
    const TIMEOUT_MS = 30000;          // 30s end-to-end
    const RETRIES = 2;                 // total 3 attempts
    const BACKOFF_MS = [1500, 4000];   // retry delays
    
    const prompt = `Person: ${personName}
Title: ${title}
Snippet: ${snippet}

Question: Is this article about Alberta separation, independence, secession, statehood (incl. '51 state'), or remaining in Canada (any stance, even dodges)? Is it tied to this politician?

Answer ONLY in JSON:
{"relevance_score":0-100,"relevant":true|false,"ties_to_politician":true|false,"reason":"30-50 words"}`;

    console.log(`🤖 Calling GPT-5-mini for: "${title}"`);
    
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      try {
        const response = await this.openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: 'You are a JSON-only response assistant. Answer ONLY in valid JSON format.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const content = response.choices[0].message.content;
        console.log(`📤 Raw GPT-5-mini response: ${content}`);
        
        // Parse JSON with explicit error handling
        let result;
        try { 
          result = JSON.parse(content);
          console.log(`✅ Successfully parsed JSON:`, result);
        } catch(parseError) {
          console.error("GPT_PARSE_FAIL", { 
            row_id: `${personName}_${title.substring(0, 20)}`, 
            msg: parseError.message, 
            raw: content.substring(0, 120) + "..." 
          });
          throw new Error(`JSON parse failed: ${parseError.message}`);
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
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          console.error("GPT_TIMEOUT", { 
            row_id: `${personName}_${title.substring(0, 20)}`, 
            attempt: attempt + 1,
            timeout_ms: TIMEOUT_MS 
          });
        } else if (error.status === 429 || (error.status >= 500 && error.status < 600)) {
          console.error("GPT_BACKOFF", { 
            row_id: `${personName}_${title.substring(0, 20)}`, 
            status: error.status,
            attempt: attempt + 1,
            message: error.message 
          });
        } else {
          console.error("GPT_FAIL", { 
            row_id: `${personName}_${title.substring(0, 20)}`, 
            status: error.status || 'unknown',
            code: error.code || 'unknown',
            message: error.message?.substring(0, 120) || 'unknown error'
          });
        }
        
        if (attempt >= RETRIES) {
          console.error(`❌ GPT-5-mini failed after ${RETRIES + 1} attempts for ${personName}`);
          // Return default values on failure
          return {
            relevance_score: 0,
            relevant: false,
            ties_to_politician: false,
            reason: `GPT call failed: ${error.message}`
          };
        }
        
        // Wait before retry
        const delay = BACKOFF_MS[attempt];
        console.warn(`GPT call failed, retrying in ${delay}ms (attempt ${attempt + 1}/${RETRIES + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async appendToAppendBlobs(result) {
    // Build fields safely (no throws)
    const row_id = result.row_id;
    const title = String(result.article_title ?? "");
    const snippet = String(result.snippet ?? "");
    const url = String(result.url ?? "");
    const date = result.date ? String(result.date) : "";
    const person = result.person_name;

    // Build CSV line with safe escaping
    function esc(s) { return `"${String(s).replace(/"/g, '""')}"`; }
    const csvLine = [
      row_id, result.run_id, person, date, title, snippet, url,
      result.relevance_score, result.relevant, result.ties_to_politician, result.reason
    ].map(esc).join(",") + "\n";

    // Build JSONL object
    const jsonlObj = {
      row_id, run_id: result.run_id, person_name: person, date,
      article_title: title, snippet, url,
      relevance_score: result.relevance_score,
      relevant: result.relevant,
      ties_to_politician: result.ties_to_politician,
      reason: result.reason
    };
    const jsonlLine = JSON.stringify(jsonlObj) + "\n";

    // Append with precise logging
    try {
      await this.csvAppendBlob.appendBlock(Buffer.from(csvLine, "utf8"), Buffer.byteLength(csvLine, "utf8"));
    } catch (e) {
      console.error("APPEND_FAIL_CSV", { row_id, msg: e.message, code: e.code, stack: e.stack });
      throw e; // Re-throw so calling code can handle the error
    }

    try {
      await this.jsonlAppendBlob.appendBlock(Buffer.from(jsonlLine, "utf8"), Buffer.byteLength(jsonlLine, "utf8"));
    } catch (e) {
      console.error("APPEND_FAIL_JSONL", { row_id, msg: e.message, code: e.code, stack: e.stack });
      throw e; // Re-throw so calling code can handle the error
    }
  }

  async updateStatus(status) {
    try {
      await this.statusBlob.uploadData(Buffer.from(JSON.stringify(status)), { overwrite: true });
    } catch (error) {
      console.warn('Warning: Could not update status blob:', error.message);
    }
  }

  async getStatus() {
    try {
      const downloadResponse = await this.statusBlob.download();
      const content = await this.streamToString(downloadResponse.readableStreamBody);
      return JSON.parse(content);
    } catch (error) {
      console.warn('Warning: Could not read status blob:', error.message);
      return {
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

  async runInventoryPass() {
    console.log('📊 Starting inventory pass...');
    
    // Discover all blobs
    const blobFiles = await this.discoverBlobFiles();
    console.log(`📁 Found ${blobFiles.length} blob files`);
    
    // Per-slug rollup
    const slugData = {};
    let totalFiles = 0;
    let totalArticles = 0;
    let totalMalformed = 0;
    let totalEmpty = 0;
    
    // Process each blob
    for (const blobPath of blobFiles) {
      try {
        totalFiles++;
        
        // Extract slug from path: raw/serp/{slug}/{filename}.json
        const pathParts = blobPath.split('/');
        const slug = pathParts[2];
        
        if (!slugData[slug]) {
          slugData[slug] = {
            slug: slug,
            who: 'Unknown',
            files_count: 0,
            articles_sum: 0,
            empty_files_count: 0,
            malformed_count: 0
          };
        }
        
        slugData[slug].files_count++;
        
        // Download and parse JSON
        try {
          const content = await this.downloadBlob(blobPath);
          const data = JSON.parse(content);
          
          // Update who field if available
          if (data.who && slugData[slug].who === 'Unknown') {
            slugData[slug].who = data.who;
          }
          
          // Check for malformed data
          if (!data.raw || !Array.isArray(data.raw)) {
            slugData[slug].malformed_count++;
            totalMalformed++;
            console.log(`⚠️ Malformed JSON in ${blobPath}: missing or invalid raw array`);
            continue;
          }
          
          const articleCount = data.raw.length;
          slugData[slug].articles_sum += articleCount;
          totalArticles += articleCount;
          
          if (articleCount === 0) {
            slugData[slug].empty_files_count++;
            totalEmpty++;
          }
          
        } catch (parseError) {
          slugData[slug].malformed_count++;
          totalMalformed++;
          console.log(`❌ Failed to parse ${blobPath}:`, parseError.message);
        }
        
      } catch (downloadError) {
        console.log(`❌ Failed to download ${blobPath}:`, downloadError.message);
        totalMalformed++;
      }
    }
    
    // Load roster for reconciliation
    let expectedSlugs = new Set();
    let missingSlugs = [];
    let extraSlugs = [];
    
    try {
      const rosterPath = 'data/ab-roster-transformed.json';
      const rosterContent = await this.downloadBlob(rosterPath);
      const roster = JSON.parse(rosterContent);
      
      // Extract slugs from roster (assuming it has a slug field)
      if (Array.isArray(roster)) {
        roster.forEach(person => {
          if (person.slug) {
            expectedSlugs.add(person.slug);
          }
        });
      }
      
      // Find missing and extra slugs
      const seenSlugs = new Set(Object.keys(slugData));
      missingSlugs = [...expectedSlugs].filter(slug => !seenSlugs.has(slug));
      extraSlugs = [...seenSlugs].filter(slug => !expectedSlugs.has(slug));
      
    } catch (rosterError) {
      console.log(`⚠️ Could not load roster for reconciliation:`, rosterError.message);
    }
    
    // Write reports
    await this.writeInventoryReports(slugData, {
      total_slugs_seen: Object.keys(slugData).length,
      total_files: totalFiles,
      total_articles: totalArticles,
      total_empty: totalEmpty,
      total_malformed: totalMalformed,
      missing_slugs_count: missingSlugs.length,
      extra_slugs_count: extraSlugs.length
    }, missingSlugs, extraSlugs);
    
    // Update status
    const status = {
      run_id: new Date().toISOString(),
      mode: 'inventory',
      total_slugs_seen: Object.keys(slugData).length,
      total_files: totalFiles,
      total_articles: totalArticles,
      total_empty: totalEmpty,
      total_malformed: totalMalformed,
      missing_slugs_count: missingSlugs.length,
      extra_slugs_count: extraSlugs.length,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.updateStatus(status);
    
    console.log(`✅ Inventory pass completed:`);
    console.log(`   - Total slugs: ${Object.keys(slugData).length}`);
    console.log(`   - Total files: ${totalFiles}`);
    console.log(`   - Total articles: ${totalArticles}`);
    console.log(`   - Empty files: ${totalEmpty}`);
    console.log(`   - Malformed files: ${totalMalformed}`);
    console.log(`   - Missing slugs: ${missingSlugs.length}`);
    console.log(`   - Extra slugs: ${extraSlugs.length}`);
    
    return status;
  }

  async writeInventoryReports(slugData, summary, missingSlugs, extraSlugs) {
    try {
      // Ensure inventory directory exists
      const inventoryContainer = this.blobServiceClient.getContainerClient(this.containerName);
      
      // Write inventory by slug CSV
      const slugCsvHeader = 'slug,who,files_count,articles_sum,empty_files_count,malformed_count\n';
      let slugCsvContent = slugCsvHeader;
      
      Object.values(slugData).forEach(slug => {
        const row = `${slug.slug},"${slug.who}",${slug.files_count},${slug.articles_sum},${slug.empty_files_count},${slug.malformed_count}\n`;
        slugCsvContent += row;
      });
      
      const slugCsvBlob = inventoryContainer.getBlockBlobClient('analysis/inventory/inventory_by_slug.csv');
      await slugCsvBlob.uploadData(Buffer.from(slugCsvContent, 'utf8'), { overwrite: true });
      
      // Write summary CSV
      const summaryCsvHeader = 'total_slugs_seen,total_files,total_articles,total_empty,total_malformed,missing_slugs_count,extra_slugs_count\n';
      const summaryCsvRow = `${summary.total_slugs_seen},${summary.total_files},${summary.total_articles},${summary.total_empty},${summary.total_malformed},${summary.missing_slugs_count},${summary.extra_slugs_count}\n`;
      const summaryCsvContent = summaryCsvHeader + summaryCsvRow;
      
      const summaryCsvBlob = inventoryContainer.getBlockBlobClient('analysis/inventory/summary.csv');
      await summaryCsvBlob.uploadData(Buffer.from(summaryCsvContent, 'utf8'), { overwrite: true });
      
      // Write missing slugs CSV
      const missingSlugsContent = missingSlugs.join('\n') + '\n';
      const missingSlugsBlob = inventoryContainer.getBlockBlobClient('analysis/inventory/missing_slugs.csv');
      await missingSlugsBlob.uploadData(Buffer.from(missingSlugsContent, 'utf8'), { overwrite: true });
      
      // Write extra slugs CSV
      const extraSlugsContent = extraSlugs.join('\n') + '\n';
      const extraSlugsBlob = inventoryContainer.getBlockBlobClient('analysis/inventory/extra_slugs.csv');
      await extraSlugsBlob.uploadData(Buffer.from(extraSlugsContent, 'utf8'), { overwrite: true });
      
      console.log(`✅ Inventory reports written to analysis/inventory/`);
      
    } catch (error) {
      console.error(`❌ Failed to write inventory reports:`, error.message);
      throw error;
    }
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
