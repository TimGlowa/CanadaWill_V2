#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const HOST = "https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net";
const ROSTER_PATH = path.join(__dirname, '../express-ingest/data/ab-roster-transformed.json');
const DAYS = 60;
const LIMIT = 100;

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

async function capturePolitician(slug, name, level) {
  const url = `${HOST}/api/ingest/run?who=${slug}&days=60`;
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[${timestamp}] Capturing ${name} (${level}) - ${slug}...`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`  ✅ Response: ${JSON.stringify(data)}`);
    
    return {
      slug,
      name,
      level,
      success: true,
      response: data,
      timestamp,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Error: ${errorMsg}`);
    
    return {
      slug,
      name,
      level,
      success: false,
      error: errorMsg,
      timestamp,
    };
  }
}

async function main() {
  console.log('🚀 Running sweep for Danielle Smith only (test mode)...');
  console.log(`📅 Days: ${DAYS}, Limit: ${LIMIT}`);
  console.log(`🌐 Endpoint: ${HOST}/api/capture`);
  console.log('---');
  
  const politicians = loadRoster();
  console.log(`📋 Loaded ${politicians.length} politicians (MLAs + MPs)`);
  console.log('---');
  
  // TEMPORARY TEST MODE: Only process danielle-smith
  const testPoliticians = politicians.filter(p => p.slug === 'danielle-smith');
  console.log(`🧪 TEST MODE: Processing only ${testPoliticians.length} politician (danielle-smith)`);
  console.log('---');
  
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  // TEMPORARY TEST MODE: Only process danielle-smith
  // TODO: Restore full roster sweep after confirming 200 OK and blob write
  for (let i = 0; i < testPoliticians.length; i++) {
    const politician = testPoliticians[i];
    const result = await capturePolitician(politician.slug, politician.fullName, politician.office);
    results.push(result);
    
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
    
    // Add delay between calls to be respectful of API
    if (i < testPoliticians.length - 1) {
      console.log('  ⏳ Waiting 2 seconds before next call...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('---');
  console.log('📊 TEST MODE CAPTURE COMPLETE');
  console.log('---');
  console.log(`✅ Successful: ${successCount}/${testPoliticians.length}`);
  console.log(`❌ Errors: ${errorCount}/${testPoliticians.length}`);
  console.log('---');
  console.log(`📈 Results:`);
  console.log(`   Total processed: ${testPoliticians.length}`);
  console.log(`   Successes: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log('---');
  
  // Save detailed results to file
  const resultsPath = path.join(__dirname, `../capture-sweep-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`💾 Detailed results saved to: ${resultsPath}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, loadRoster, capturePolitician }; 