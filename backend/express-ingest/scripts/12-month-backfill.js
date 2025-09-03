#!/usr/bin/env node

/**
 * 12-Month Backfill Script for SERPHouse Query Enhancement
 * 
 * This script performs a comprehensive backfill of article data for all 121 officials
 * using the enhanced query builder with separation and unity keywords.
 * 
 * Features:
 * - Loads all 121 officials from officials.json
 * - Uses enhanced query builder with proper boolean logic
 * - Implements 12-month backfill with daily queries
 * - Proper rate limiting and error handling
 * - Checkpointing for resumability
 * - Azure Blob Storage integration
 * - Comprehensive logging
 */

const fs = require('fs').promises;
const path = require('path');
const SerphouseClient = require('../src/providers/serphouseClient.js');
const { saveRaw } = require('../src/storage/blob.js');

class BackfillOrchestrator {
  constructor() {
    this.serphouseClient = null;
    this.blobStore = null;
    this.officials = [];
    this.results = {
      totalOfficials: 0,
      processedOfficials: 0,
      successfulQueries: 0,
      failedQueries: 0,
      totalArticles: 0,
      startTime: null,
      endTime: null,
      errors: []
    };
    this.checkpointFile = path.join(__dirname, '../data/backfill-checkpoint.json');
  }

  async initialize() {
    console.log('🚀 Initializing 12-Month Backfill Orchestrator...\n');

    // Initialize SERPHouse client
    const apiToken = process.env.SERPHOUSE_API_TOKEN;
    if (!apiToken) {
      throw new Error('SERPHOUSE_API_TOKEN environment variable is required');
    }
    this.serphouseClient = new SerphouseClient(apiToken, 6, 300, 3);

    // Initialize Blob Storage (using existing saveRaw function)
    console.log('📦 Blob storage initialized');

    // Load officials data
    await this.loadOfficials();
    console.log(`👥 Loaded ${this.officials.length} officials for backfill\n`);
  }

  async loadOfficials() {
    try {
      const officialsPath = path.join(__dirname, '../data/officials.json');
      const officialsData = await fs.readFile(officialsPath, 'utf8');
      const parsed = JSON.parse(officialsData);
      
      // Extract officials array
      this.officials = parsed.officials || parsed;
      this.results.totalOfficials = this.officials.length;
      
      console.log(`✅ Loaded ${this.officials.length} officials from ${officialsPath}`);
    } catch (error) {
      throw new Error(`Failed to load officials data: ${error.message}`);
    }
  }

  async loadCheckpoint() {
    try {
      const checkpointData = await fs.readFile(this.checkpointFile, 'utf8');
      const checkpoint = JSON.parse(checkpointData);
      console.log(`📋 Loaded checkpoint: ${checkpoint.processedOfficials}/${checkpoint.totalOfficials} officials processed`);
      return checkpoint;
    } catch (error) {
      console.log('📋 No checkpoint found, starting fresh');
      return null;
    }
  }

  async saveCheckpoint() {
    const checkpoint = {
      processedOfficials: this.results.processedOfficials,
      totalOfficials: this.results.totalOfficials,
      successfulQueries: this.results.successfulQueries,
      failedQueries: this.results.failedQueries,
      totalArticles: this.results.totalArticles,
      timestamp: new Date().toISOString(),
      errors: this.results.errors
    };

    await fs.writeFile(this.checkpointFile, JSON.stringify(checkpoint, null, 2));
    console.log(`💾 Checkpoint saved: ${checkpoint.processedOfficials}/${checkpoint.totalOfficials} officials`);
  }

  async processOfficial(official, startDate, endDate) {
    const officialResults = {
      slug: official.slug,
      fullName: official.fullName,
      office: official.office,
      queries: [],
      totalArticles: 0,
      errors: []
    };

    console.log(`\n🔍 Processing ${official.fullName} (${official.slug}) - ${official.office}`);

    // Generate date range for 12 months
    const dates = this.generateDateRange(startDate, endDate);
    console.log(`   📅 Processing ${dates.length} days of data`);

    for (const date of dates) {
      try {
        // Build enhanced query
        const query = this.serphouseClient.buildSearchQuery(official);
        
        // Make SERPHouse request for this date
        const response = await this.makeSerphouseRequest(official, query, date);
        
        if (response.success) {
          // Store results in Azure Blob Storage using saveRaw
          const results = {
            official: official,
            query: query,
            date: date,
            timestamp: new Date().toISOString(),
            results: response.results,
            totalResults: response.totalResults
          };
          
          const blobPath = await saveRaw(official.slug, 'serp', [results]);

          officialResults.queries.push({
            date: date,
            success: true,
            articlesFound: response.totalResults,
            blobPath: blobPath
          });

          officialResults.totalArticles += response.totalResults;
          this.results.successfulQueries++;
          this.results.totalArticles += response.totalResults;

          console.log(`   ✅ ${date}: ${response.totalResults} articles found`);
        } else {
          officialResults.queries.push({
            date: date,
            success: false,
            error: response.error
          });
          officialResults.errors.push(`${date}: ${response.error}`);
          this.results.failedQueries++;
          console.log(`   ❌ ${date}: ${response.error}`);
        }

        // Rate limiting delay
        await this.delay(300);

      } catch (error) {
        const errorMsg = `Error processing ${date}: ${error.message}`;
        officialResults.errors.push(errorMsg);
        this.results.errors.push(`${official.slug} - ${errorMsg}`);
        this.results.failedQueries++;
        console.log(`   ❌ ${date}: ${error.message}`);
      }
    }

    return officialResults;
  }

  async makeSerphouseRequest(official, query, date) {
    try {
      // Convert date to proper format for SERPHouse
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const response = await this.serphouseClient.makeSerphouseRequest({
        q: query,
        num: 50,
        start: 0,
        date_start: startDate.toISOString().split('T')[0],
        date_end: endDate.toISOString().split('T')[0],
        gl: 'ca',
        hl: 'en'
      });

      if (response && response.organic_results) {
        return {
          success: true,
          results: response.organic_results,
          totalResults: response.organic_results.length
        };
      } else {
        return {
          success: true,
          results: [],
          totalResults: 0
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    try {
      this.results.startTime = new Date();
      console.log(`⏰ Backfill started at: ${this.results.startTime.toISOString()}\n`);

      // Load checkpoint if exists
      const checkpoint = await this.loadCheckpoint();
      const startIndex = checkpoint ? checkpoint.processedOfficials : 0;

      // Calculate date range (12 months back from today)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);

      console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
      console.log(`👥 Processing officials ${startIndex + 1} to ${this.officials.length}\n`);

      // Process officials
      for (let i = startIndex; i < this.officials.length; i++) {
        const official = this.officials[i];
        
        try {
          const result = await this.processOfficial(official, startDate, endDate);
          this.results.processedOfficials++;
          
          console.log(`✅ Completed ${official.fullName}: ${result.totalArticles} total articles`);
          
          // Save checkpoint every 10 officials
          if (this.results.processedOfficials % 10 === 0) {
            await this.saveCheckpoint();
          }
          
        } catch (error) {
          const errorMsg = `Failed to process ${official.fullName}: ${error.message}`;
          this.results.errors.push(errorMsg);
          this.results.processedOfficials++;
          console.log(`❌ ${errorMsg}`);
        }
      }

      this.results.endTime = new Date();
      await this.generateSummary();

    } catch (error) {
      console.error('💥 Fatal error in backfill process:', error.message);
      throw error;
    }
  }

  async generateSummary() {
    const duration = this.results.endTime - this.results.startTime;
    const durationMinutes = Math.round(duration / 60000);

    console.log('\n📊 BACKFILL SUMMARY');
    console.log('==================');
    console.log(`⏰ Duration: ${durationMinutes} minutes`);
    console.log(`👥 Officials processed: ${this.results.processedOfficials}/${this.results.totalOfficials}`);
    console.log(`✅ Successful queries: ${this.results.successfulQueries}`);
    console.log(`❌ Failed queries: ${this.results.failedQueries}`);
    console.log(`📰 Total articles found: ${this.results.totalArticles}`);
    console.log(`📦 Container: articles`);
    console.log(`📁 Path pattern: articles/{slug}/{YYYY}/{MM}/{DD}/serp-{timestamp}.json`);

    if (this.results.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${this.results.errors.length}`);
      this.results.errors.slice(0, 5).forEach(error => {
        console.log(`   - ${error}`);
      });
      if (this.results.errors.length > 5) {
        console.log(`   ... and ${this.results.errors.length - 5} more`);
      }
    }

    // Save final summary
    const summaryPath = path.join(__dirname, '../data/backfill-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Summary saved to: ${summaryPath}`);

    // Clean up checkpoint file
    try {
      await fs.unlink(this.checkpointFile);
      console.log('🧹 Checkpoint file cleaned up');
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }
}

// Main execution
async function main() {
  try {
    const orchestrator = new BackfillOrchestrator();
    await orchestrator.initialize();
    await orchestrator.run();
    console.log('\n🎉 12-Month Backfill completed successfully!');
  } catch (error) {
    console.error('\n💥 Backfill failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { BackfillOrchestrator };
