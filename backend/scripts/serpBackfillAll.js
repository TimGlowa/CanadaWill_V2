#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const HOST = "https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net";
const ROSTER_PATH = path.join(__dirname, '../express-ingest/data/ab-roster-transformed.json');
const DAYS = 365;
const LIMIT = 50;
const DELAY_MS = 300;

function loadRoster() {
  try {
    const rosterData = fs.readFileSync(ROSTER_PATH, 'utf8');
    const roster = JSON.parse(rosterData);
    
    // Filter for MLAs and MPs only, skip mayors
    return roster.filter((politician) => 
      politician.office === 'Member of Parliament' || politician.office === 'Member of Legislative Assembly'
    );
  } catch (error) {
    console.error('Failed to load roster:', error);
    process.exit(1);
  }
}

async function processOfficial(slug, name, office) {
  const url = `${HOST}/api/news/serp/backfill?who=${slug}&days=${DAYS}&limit=${LIMIT}&store=1`;
  
  try {
    console.log(`[${new Date().toISOString()}] Processing ${name} (${office}) - ${slug}...`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.ok) {
      console.log(`[${new Date().toISOString()}] ✅ ${name}: ${data.count} articles found`);
      return {
        slug,
        name,
        office,
        success: true,
        count: data.count,
        timestamp: new Date().toISOString()
      };
    } else {
      console.log(`[${new Date().toISOString()}] ❌ ${name}: ${data.error}`);
      return {
        slug,
        name,
        office,
        success: false,
        error: data.error,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    console.log(`[${new Date().toISOString()}] ❌ ${name}: ${error.message}`);
    return {
      slug,
      name,
      office,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function main() {
  console.log('🚀 Starting SERP backfill for all MLAs and MPs...');
  console.log(`📅 Days: ${DAYS}, Limit: ${LIMIT}`);
  console.log(`🌐 Endpoint: ${HOST}/api/news/serp/backfill`);
  console.log('---');
  
  const politicians = loadRoster();
  console.log(`📋 Loaded ${politicians.length} politicians (MLAs + MPs)`);
  console.log('---');
  
  const results = [];
  let totalArticles = 0;
  let successCount = 0;
  let errorCount = 0;
  
  // Process sequentially to avoid overwhelming the API
  for (let i = 0; i < politicians.length; i++) {
    const politician = politicians[i];
    const result = await processOfficial(politician.slug, politician.fullName, politician.office);
    results.push(result);
    
    if (result.success) {
      totalArticles += result.count;
      successCount++;
    } else {
      errorCount++;
    }
    
    // Add delay between calls to be respectful of API
    if (i < politicians.length - 1) {
      console.log(`  ⏳ Waiting ${DELAY_MS}ms before next call...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  console.log('---');
  console.log('📊 SERP BACKFILL COMPLETE');
  console.log('---');
  console.log(`✅ Successful: ${successCount}/${politicians.length}`);
  console.log(`❌ Errors: ${errorCount}/${politicians.length}`);
  console.log('---');
  console.log(`📈 Total articles found: ${totalArticles}`);
  console.log('---');
  
  // Save detailed results to file
  const resultsPath = path.join(__dirname, `../serp-backfill-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`💾 Detailed results saved to: ${resultsPath}`);
}

main().catch(console.error);
