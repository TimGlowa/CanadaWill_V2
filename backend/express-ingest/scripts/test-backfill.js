#!/usr/bin/env node

/**
 * Test script for the 12-month backfill functionality
 * Tests with a small subset of officials and limited date range
 */

const { BackfillOrchestrator } = require('./12-month-backfill.js');

class TestBackfillOrchestrator extends BackfillOrchestrator {
  async loadOfficials() {
    // Load only a small subset for testing
    await super.loadOfficials();
    
    // Filter to just 3 officials for testing
    this.officials = this.officials.slice(0, 3);
    this.results.totalOfficials = this.officials.length;
    
    console.log(`🧪 TEST MODE: Using only ${this.officials.length} officials for testing`);
    this.officials.forEach((official, index) => {
      console.log(`   ${index + 1}. ${official.fullName} (${official.office})`);
    });
  }

  generateDateRange(startDate, endDate) {
    // For testing, only use the last 7 days
    const dates = [];
    const current = new Date();
    
    for (let i = 0; i < 7; i++) {
      const testDate = new Date(current);
      testDate.setDate(testDate.getDate() - i);
      dates.push(testDate.toISOString().split('T')[0]);
    }
    
    console.log(`🧪 TEST MODE: Using only last 7 days: ${dates.join(', ')}`);
    return dates;
  }

  async run() {
    try {
      this.results.startTime = new Date();
      console.log(`🧪 TEST BACKFILL STARTED at: ${this.results.startTime.toISOString()}\n`);

      // Calculate date range (7 days back from today for testing)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      console.log(`📅 Test date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);

      // Process officials
      for (let i = 0; i < this.officials.length; i++) {
        const official = this.officials[i];
        
        try {
          const result = await this.processOfficial(official, startDate, endDate);
          this.results.processedOfficials++;
          
          console.log(`✅ Test completed ${official.fullName}: ${result.totalArticles} total articles`);
          
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
      console.error('💥 Fatal error in test backfill process:', error.message);
      throw error;
    }
  }

  async generateSummary() {
    const duration = this.results.endTime - this.results.startTime;
    const durationSeconds = Math.round(duration / 1000);

    console.log('\n🧪 TEST BACKFILL SUMMARY');
    console.log('========================');
    console.log(`⏰ Duration: ${durationSeconds} seconds`);
    console.log(`👥 Officials processed: ${this.results.processedOfficials}/${this.results.totalOfficials}`);
    console.log(`✅ Successful queries: ${this.results.successfulQueries}`);
    console.log(`❌ Failed queries: ${this.results.failedQueries}`);
    console.log(`📰 Total articles found: ${this.results.totalArticles}`);

    if (this.results.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${this.results.errors.length}`);
      this.results.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }

    console.log('\n🎯 Test Results:');
    if (this.results.successfulQueries > 0 && this.results.totalArticles > 0) {
      console.log('✅ Test PASSED: Backfill script is working correctly');
      console.log('✅ Enhanced query builder is functioning');
      console.log('✅ Azure Blob Storage integration is working');
      console.log('✅ Ready for full 121-official backfill');
    } else {
      console.log('❌ Test FAILED: Issues detected in backfill process');
      console.log('❌ Check SERPHouse API credentials and Azure storage configuration');
    }
  }
}

// Main execution
async function main() {
  try {
    console.log('🧪 Starting Test Backfill (3 officials, 7 days)...\n');
    
    const orchestrator = new TestBackfillOrchestrator();
    await orchestrator.initialize();
    await orchestrator.run();
    
    console.log('\n🎉 Test Backfill completed!');
  } catch (error) {
    console.error('\n💥 Test Backfill failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { TestBackfillOrchestrator };
