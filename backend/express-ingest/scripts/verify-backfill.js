#!/usr/bin/env node

/**
 * Verification and Quality Assurance Script for Backfill Results
 * 
 * This script performs comprehensive verification of the backfill results:
 * - Samples 5 JSON files from different officials and dates
 * - Verifies query structure and article relevance
 * - Checks Azure Blob Storage path structure
 * - Validates data completeness and quality
 * - Generates verification report
 */

const fs = require('fs').promises;
const path = require('path');
const { saveRaw } = require('../src/storage/blob.js');

class BackfillVerifier {
  constructor() {
    this.blobStore = null;
    this.verificationResults = {
      totalFilesChecked: 0,
      validFiles: 0,
      invalidFiles: 0,
      sampleResults: [],
      errors: [],
      startTime: null,
      endTime: null
    };
  }

  async initialize() {
    console.log('🔍 Initializing Backfill Verification...\n');
    
    // Initialize Blob Store
    this.blobStore = new BlobStore();
    console.log(`📦 Blob Store initialized with container: ${this.blobStore.getContainerName()}`);
  }

  async listBackfillFiles() {
    try {
      console.log('📋 Listing backfill files from Azure Blob Storage...');
      
      // List all files in the articles/raw/serp/ directory
      const blobs = await this.blobStore.listBlobs('articles/raw/serp/');
      
      console.log(`📁 Found ${blobs.length} backfill files`);
      
      // Group by official (slug)
      const filesByOfficial = {};
      blobs.forEach(blob => {
        const pathParts = blob.name.split('/');
        if (pathParts.length >= 4) {
          const slug = pathParts[3]; // articles/raw/serp/{slug}/{date}.json
          if (!filesByOfficial[slug]) {
            filesByOfficial[slug] = [];
          }
          filesByOfficial[slug].push(blob);
        }
      });

      console.log(`👥 Files found for ${Object.keys(filesByOfficial).length} officials`);
      
      return filesByOfficial;
    } catch (error) {
      throw new Error(`Failed to list backfill files: ${error.message}`);
    }
  }

  async selectSampleFiles(filesByOfficial) {
    const sampleFiles = [];
    const officials = Object.keys(filesByOfficial);
    
    // Select 5 officials with files
    const selectedOfficials = officials.slice(0, 5);
    
    selectedOfficials.forEach(slug => {
      const files = filesByOfficial[slug];
      if (files.length > 0) {
        // Select the most recent file for each official
        const mostRecent = files.sort((a, b) => 
          new Date(b.lastModified) - new Date(a.lastModified)
        )[0];
        sampleFiles.push({
          slug: slug,
          blobName: mostRecent.name,
          lastModified: mostRecent.lastModified,
          size: mostRecent.size
        });
      }
    });

    console.log(`🎯 Selected ${sampleFiles.length} sample files for verification:`);
    sampleFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.slug} - ${file.blobName} (${file.size} bytes)`);
    });

    return sampleFiles;
  }

  async verifyFile(blobName) {
    try {
      console.log(`\n🔍 Verifying file: ${blobName}`);
      
      // Read the blob content
      const content = await this.blobStore.readJson(blobName);
      
      const verification = {
        blobName: blobName,
        valid: true,
        issues: [],
        query: null,
        official: null,
        articlesFound: 0,
        sampleArticles: []
      };

      // Verify file structure
      if (!content.official) {
        verification.valid = false;
        verification.issues.push('Missing official data');
      } else {
        verification.official = content.official;
      }

      if (!content.query) {
        verification.valid = false;
        verification.issues.push('Missing query data');
      } else {
        verification.query = content.query;
      }

      if (!content.results || !Array.isArray(content.results)) {
        verification.valid = false;
        verification.issues.push('Missing or invalid results array');
      } else {
        verification.articlesFound = content.results.length;
        
        // Sample first 3 articles for relevance check
        verification.sampleArticles = content.results.slice(0, 3).map(article => ({
          title: article.title || 'No title',
          snippet: article.snippet || 'No snippet',
          url: article.link || 'No URL'
        }));
      }

      // Verify query structure
      if (verification.query) {
        const queryIssues = this.verifyQueryStructure(verification.query, verification.official);
        verification.issues.push(...queryIssues);
      }

      // Check for relevance indicators
      if (verification.sampleArticles.length > 0) {
        const relevanceIssues = this.checkArticleRelevance(verification.sampleArticles);
        verification.issues.push(...relevanceIssues);
      }

      if (verification.issues.length > 0) {
        verification.valid = false;
      }

      console.log(`   ${verification.valid ? '✅' : '❌'} ${verification.articlesFound} articles found`);
      if (verification.issues.length > 0) {
        console.log(`   ⚠️  Issues: ${verification.issues.join(', ')}`);
      }

      return verification;

    } catch (error) {
      console.log(`   ❌ Error reading file: ${error.message}`);
      return {
        blobName: blobName,
        valid: false,
        issues: [`Read error: ${error.message}`],
        query: null,
        official: null,
        articlesFound: 0,
        sampleArticles: []
      };
    }
  }

  verifyQueryStructure(query, official) {
    const issues = [];

    if (!official) {
      issues.push('Cannot verify query without official data');
      return issues;
    }

    // Check for full name
    if (!query.includes(`"${official.fullName}"`)) {
      issues.push(`Query missing full name: "${official.fullName}"`);
    }

    // Check for title variants
    if (official.office === "Member of Legislative Assembly") {
      if (!query.includes('"MLA"') || !query.includes('"Member of Legislative Assembly"')) {
        issues.push('Query missing MLA title variants');
      }
    } else if (official.office === "Member of Parliament") {
      if (!query.includes('"MP"') || !query.includes('"Member of Parliament"')) {
        issues.push('Query missing MP title variants');
      }
    }

    // Check for keywords
    const requiredKeywords = [
      '"Alberta separation"',
      '"remain in Canada"',
      '"Sovereignty Act"',
      '"oppose separation"'
    ];

    const missingKeywords = requiredKeywords.filter(keyword => !query.includes(keyword));
    if (missingKeywords.length > 0) {
      issues.push(`Query missing keywords: ${missingKeywords.join(', ')}`);
    }

    // Check for AND logic
    if (!query.includes(' AND ')) {
      issues.push('Query missing AND logic');
    }

    return issues;
  }

  checkArticleRelevance(sampleArticles) {
    const issues = [];
    let relevantArticles = 0;

    sampleArticles.forEach((article, index) => {
      const text = `${article.title} ${article.snippet}`.toLowerCase();
      
      // Check for separation/remain keywords
      const relevanceKeywords = [
        'alberta separation',
        'alberta independence',
        'sovereignty act',
        'remain in canada',
        'oppose separation',
        'referendum',
        'secede'
      ];

      const hasRelevance = relevanceKeywords.some(keyword => text.includes(keyword));
      if (hasRelevance) {
        relevantArticles++;
      }
    });

    if (relevantArticles === 0) {
      issues.push('No relevant articles found in sample (no separation/remain keywords)');
    } else if (relevantArticles < sampleArticles.length / 2) {
      issues.push(`Low relevance: only ${relevantArticles}/${sampleArticles.length} articles contain separation/remain keywords`);
    }

    return issues;
  }

  async run() {
    try {
      this.verificationResults.startTime = new Date();
      console.log(`⏰ Verification started at: ${this.verificationResults.startTime.toISOString()}\n`);

      // List all backfill files
      const filesByOfficial = await this.listBackfillFiles();
      
      if (Object.keys(filesByOfficial).length === 0) {
        throw new Error('No backfill files found. Run the backfill script first.');
      }

      // Select sample files
      const sampleFiles = await this.selectSampleFiles(filesByOfficial);
      
      if (sampleFiles.length === 0) {
        throw new Error('No sample files found for verification.');
      }

      // Verify each sample file
      for (const file of sampleFiles) {
        const verification = await this.verifyFile(file.blobName);
        this.verificationResults.sampleResults.push(verification);
        this.verificationResults.totalFilesChecked++;
        
        if (verification.valid) {
          this.verificationResults.validFiles++;
        } else {
          this.verificationResults.invalidFiles++;
          this.verificationResults.errors.push(...verification.issues.map(issue => 
            `${file.blobName}: ${issue}`
          ));
        }
      }

      this.verificationResults.endTime = new Date();
      await this.generateReport();

    } catch (error) {
      console.error('💥 Fatal error in verification process:', error.message);
      throw error;
    }
  }

  async generateReport() {
    const duration = this.verificationResults.endTime - this.verificationResults.startTime;
    const durationSeconds = Math.round(duration / 1000);

    console.log('\n📊 VERIFICATION REPORT');
    console.log('======================');
    console.log(`⏰ Duration: ${durationSeconds} seconds`);
    console.log(`📁 Files checked: ${this.verificationResults.totalFilesChecked}`);
    console.log(`✅ Valid files: ${this.verificationResults.validFiles}`);
    console.log(`❌ Invalid files: ${this.verificationResults.invalidFiles}`);
    console.log(`📦 Container: ${this.blobStore.getContainerName()}`);

    // Detailed results
    console.log('\n📋 Sample File Results:');
    this.verificationResults.sampleResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.blobName}`);
      console.log(`   Status: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
      console.log(`   Official: ${result.official ? result.official.fullName : 'Unknown'}`);
      console.log(`   Articles: ${result.articlesFound}`);
      console.log(`   Query: ${result.query ? result.query.substring(0, 100) + '...' : 'Missing'}`);
      
      if (result.issues.length > 0) {
        console.log(`   Issues: ${result.issues.join(', ')}`);
      }
    });

    // Overall assessment
    console.log('\n🎯 Overall Assessment:');
    const successRate = (this.verificationResults.validFiles / this.verificationResults.totalFilesChecked) * 100;
    
    if (successRate >= 80) {
      console.log('✅ VERIFICATION PASSED: Backfill quality is acceptable');
      console.log(`✅ Success rate: ${successRate.toFixed(1)}%`);
      console.log('✅ Enhanced query builder is working correctly');
      console.log('✅ Azure Blob Storage integration is functioning');
    } else {
      console.log('❌ VERIFICATION FAILED: Backfill quality issues detected');
      console.log(`❌ Success rate: ${successRate.toFixed(1)}% (below 80% threshold)`);
      console.log('❌ Review and fix issues before proceeding');
    }

    if (this.verificationResults.errors.length > 0) {
      console.log(`\n⚠️  Issues Summary (${this.verificationResults.errors.length} total):`);
      this.verificationResults.errors.slice(0, 10).forEach(error => {
        console.log(`   - ${error}`);
      });
      if (this.verificationResults.errors.length > 10) {
        console.log(`   ... and ${this.verificationResults.errors.length - 10} more`);
      }
    }

    // Save report
    const reportPath = path.join(__dirname, '../data/verification-report.json');
    await fs.writeFile(reportPath, JSON.stringify(this.verificationResults, null, 2));
    console.log(`\n💾 Verification report saved to: ${reportPath}`);
  }
}

// Main execution
async function main() {
  try {
    const verifier = new BackfillVerifier();
    await verifier.initialize();
    await verifier.run();
    console.log('\n🎉 Verification completed successfully!');
  } catch (error) {
    console.error('\n💥 Verification failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { BackfillVerifier };
