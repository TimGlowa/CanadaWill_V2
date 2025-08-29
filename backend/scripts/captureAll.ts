#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

interface Politician {
  slug: string;
  level: string;
  name: string;
}

interface CaptureResponse {
  found: number;
  dedupedCount: number;
  filteredCount: number;
  newSaved: number;
  dupSkipped: number;
  savedKeys: string[];
}

interface CaptureResult {
  slug: string;
  name: string;
  level: string;
  success: boolean;
  response?: CaptureResponse;
  error?: string;
  timestamp: string;
}

const LIVE_ENDPOINT = 'https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net/api/capture';
const ROSTER_PATH = path.join(__dirname, '../express-ingest/data/ab-roster-transformed.json');
const DAYS = 60;
const LIMIT = 100;

async function loadRoster(): Promise<Politician[]> {
  try {
    const rosterData = fs.readFileSync(ROSTER_PATH, 'utf8');
    const roster = JSON.parse(rosterData);
    
    // Filter for MLAs and MPs only, skip mayors
    return roster.filter((politician: any) => 
      politician.level === 'MLA' || politician.level === 'MP'
    );
  } catch (error) {
    console.error('Failed to load roster:', error);
    process.exit(1);
  }
}

async function capturePolitician(slug: string, name: string, level: string): Promise<CaptureResult> {
  const url = `${LIVE_ENDPOINT}?who=${slug}&days=${DAYS}&limit=${LIMIT}`;
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
    
    const data = await response.json() as CaptureResponse;
    
    console.log(`  ✅ Found: ${data.found}, New: ${data.newSaved}, Dupes: ${data.dupSkipped}`);
    
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
  console.log('🚀 Starting capture sweep for all MLAs and MPs...');
  console.log(`📅 Days: ${DAYS}, Limit: ${LIMIT}`);
  console.log(`🌐 Endpoint: ${LIVE_ENDPOINT}`);
  console.log('---');
  
  const politicians = await loadRoster();
  console.log(`📋 Loaded ${politicians.length} politicians (MLAs + MPs)`);
  console.log('---');
  
  const results: CaptureResult[] = [];
  let totalFound = 0;
  let totalNewSaved = 0;
  let totalDupSkipped = 0;
  let successCount = 0;
  let errorCount = 0;
  
  // Process sequentially to avoid quota spikes
  for (let i = 0; i < politicians.length; i++) {
    const politician = politicians[i];
    const result = await capturePolitician(politician.slug, politician.name, politician.level);
    results.push(result);
    
    if (result.success && result.response) {
      totalFound += result.response.found;
      totalNewSaved += result.response.newSaved;
      totalDupSkipped += result.response.dupSkipped;
      successCount++;
    } else {
      errorCount++;
    }
    
    // Add delay between calls to be respectful of API
    if (i < politicians.length - 1) {
      console.log('  ⏳ Waiting 2 seconds before next call...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('---');
  console.log('📊 CAPTURE SWEEP COMPLETE');
  console.log('---');
  console.log(`✅ Successful: ${successCount}/${politicians.length}`);
  console.log(`❌ Errors: ${errorCount}/${politicians.length}`);
  console.log('---');
  console.log(`📈 Totals across all representatives:`);
  console.log(`   Found: ${totalFound}`);
  console.log(`   New Saved: ${totalNewSaved}`);
  console.log(`   Dupes Skipped: ${totalDupSkipped}`);
  console.log('---');
  
  // Save detailed results to file
  const resultsPath = path.join(__dirname, `../capture-sweep-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`💾 Detailed results saved to: ${resultsPath}`);
}

if (require.main === module) {
  main().catch(console.error);
}

export { main, loadRoster, capturePolitician }; 