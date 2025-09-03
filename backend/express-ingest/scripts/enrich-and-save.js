#!/usr/bin/env node

/**
 * Enrich and Save Roster Data
 * Enriches the roster data and saves it locally with the district information
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const ROSTER_FILE = path.join(__dirname, '../data/ab-roster-transformed.json');
const ENRICHED_FILE = path.join(__dirname, '../data/officials.json');
const RATE_LIMIT_DELAY = 1000; // 1 second between API calls
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Statistics tracking
let stats = {
  total: 0,
  mps: 0,
  mlas: 0,
  mpsEnriched: 0,
  mlasVerified: 0,
  mlasUpdated: 0,
  errors: 0,
  skipped: 0
};

// Error log
let errorLog = [];

/**
 * Sleep utility for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Query the Represent API for district information
 */
async function getDistrictFromRepresent(name, office, retries = MAX_RETRIES) {
  try {
    // Convert office to Represent API format
    const representOffice = office === 'Member of Parliament' ? 'MP' : 'MLA';
    
    const baseUrl = 'https://represent.opennorth.ca/representatives/';
    const params = new URLSearchParams({
      name: name,
      elected_office: representOffice
    });
    
    console.log(`[API] Querying Represent API for: ${name} (${representOffice})`);
    
    const response = await axios.get(`${baseUrl}?${params}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'CanadaWill-RosterEnrichment/1.0'
      }
    });
    
    if (response.data.objects && response.data.objects.length > 0) {
      const result = response.data.objects[0];
      console.log(`[API] Found district: ${result.district_name} for ${name}`);
      return result.district_name;
    }
    
    console.log(`[API] No results found for: ${name} (${representOffice})`);
    return null;
    
  } catch (error) {
    if (retries > 0) {
      console.log(`[API] Error for ${name}, retrying in ${RETRY_DELAY}ms... (${retries} attempts left)`);
      await sleep(RETRY_DELAY);
      return getDistrictFromRepresent(name, office, retries - 1);
    }
    
    const errorMsg = `API error for ${name}: ${error.message}`;
    console.error(`[ERROR] ${errorMsg}`);
    errorLog.push(errorMsg);
    stats.errors++;
    return null;
  }
}

/**
 * Load and parse the roster data
 */
function loadRosterData() {
  try {
    console.log(`[LOAD] Loading roster data from: ${ROSTER_FILE}`);
    
    if (!fs.existsSync(ROSTER_FILE)) {
      throw new Error(`Roster file not found: ${ROSTER_FILE}`);
    }
    
    const rawData = fs.readFileSync(ROSTER_FILE, 'utf8');
    const roster = JSON.parse(rawData);
    
    if (!Array.isArray(roster)) {
      throw new Error('Roster data is not an array');
    }
    
    console.log(`[LOAD] Successfully loaded ${roster.length} officials`);
    return roster;
    
  } catch (error) {
    console.error(`[ERROR] Failed to load roster data: ${error.message}`);
    throw error;
  }
}

/**
 * Enrich MP data with district information
 */
async function enrichMPs(roster) {
  const mps = roster.filter(official => official.office === 'Member of Parliament');
  stats.mps = mps.length;
  
  console.log(`[ENRICH] Processing ${mps.length} MPs...`);
  
  for (let i = 0; i < mps.length; i++) {
    const mp = mps[i];
    console.log(`[ENRICH] Processing MP ${i + 1}/${mps.length}: ${mp.fullName}`);
    
    try {
      const districtName = await getDistrictFromRepresent(mp.fullName, mp.office);
      
      if (districtName) {
        mp.district_name = districtName;
        mp.riding = districtName; // Also update the riding field for consistency
        stats.mpsEnriched++;
        console.log(`[ENRICH] ✓ Enriched ${mp.fullName} with district: ${districtName}`);
      } else {
        console.log(`[ENRICH] ✗ Could not find district for ${mp.fullName}`);
        stats.skipped++;
      }
      
      // Rate limiting
      if (i < mps.length - 1) {
        await sleep(RATE_LIMIT_DELAY);
      }
      
    } catch (error) {
      const errorMsg = `Failed to enrich MP ${mp.fullName}: ${error.message}`;
      console.error(`[ERROR] ${errorMsg}`);
      errorLog.push(errorMsg);
      stats.errors++;
    }
  }
}

/**
 * Verify and update MLA district information
 */
async function verifyMLAs(roster) {
  const mlas = roster.filter(official => official.office === 'Member of Legislative Assembly');
  stats.mlas = mlas.length;
  
  console.log(`[VERIFY] Processing ${mlas.length} MLAs...`);
  
  for (let i = 0; i < mlas.length; i++) {
    const mla = mlas[i];
    console.log(`[VERIFY] Processing MLA ${i + 1}/${mlas.length}: ${mla.fullName}`);
    
    try {
      const apiDistrictName = await getDistrictFromRepresent(mla.fullName, mla.office);
      
      if (apiDistrictName) {
        stats.mlasVerified++;
        
        // Check if the district name matches
        if (mla.riding && mla.riding !== apiDistrictName) {
          console.log(`[VERIFY] ⚠ District mismatch for ${mla.fullName}:`);
          console.log(`[VERIFY]   Existing: ${mla.riding}`);
          console.log(`[VERIFY]   API: ${apiDistrictName}`);
          
          // Update with API data
          mla.district_name = apiDistrictName;
          mla.riding = apiDistrictName;
          stats.mlasUpdated++;
          console.log(`[VERIFY] ✓ Updated ${mla.fullName} district to: ${apiDistrictName}`);
        } else {
          // Add district_name field for consistency
          mla.district_name = mla.riding || apiDistrictName;
          console.log(`[VERIFY] ✓ Verified ${mla.fullName} district: ${mla.district_name}`);
        }
      } else {
        // Keep existing riding data and add district_name field
        mla.district_name = mla.riding;
        console.log(`[VERIFY] ✗ Could not verify district for ${mla.fullName}, keeping existing: ${mla.riding}`);
        stats.skipped++;
      }
      
      // Rate limiting
      if (i < mlas.length - 1) {
        await sleep(RATE_LIMIT_DELAY);
      }
      
    } catch (error) {
      const errorMsg = `Failed to verify MLA ${mla.fullName}: ${error.message}`;
      console.error(`[ERROR] ${errorMsg}`);
      errorLog.push(errorMsg);
      stats.errors++;
    }
  }
}

/**
 * Save enriched data locally
 */
function saveEnrichedData(roster) {
  try {
    console.log(`[SAVE] Saving enriched data locally...`);
    
    const enrichedData = {
      officials: roster,
      metadata: {
        lastUpdated: new Date().toISOString(),
        totalOfficials: roster.length,
        mps: stats.mps,
        mlas: stats.mlas,
        mpsEnriched: stats.mpsEnriched,
        mlasVerified: stats.mlasVerified,
        mlasUpdated: stats.mlasUpdated,
        errors: stats.errors,
        skipped: stats.skipped
      }
    };
    
    const jsonString = JSON.stringify(enrichedData, null, 2);
    fs.writeFileSync(ENRICHED_FILE, jsonString, 'utf8');
    
    console.log(`[SAVE] ✓ Successfully saved enriched data to ${ENRICHED_FILE}`);
    return enrichedData;
    
  } catch (error) {
    console.error(`[ERROR] Failed to save enriched data: ${error.message}`);
    throw error;
  }
}

/**
 * Verify results by checking a random sample
 */
async function verifyResults(roster) {
  console.log(`[VERIFY] Performing verification checks...`);
  
  // Select 3 random MPs and 3 random MLAs
  const mps = roster.filter(o => o.office === 'Member of Parliament');
  const mlas = roster.filter(o => o.office === 'Member of Legislative Assembly');
  
  const randomMPs = mps.sort(() => 0.5 - Math.random()).slice(0, 3);
  const randomMLAs = mlas.sort(() => 0.5 - Math.random()).slice(0, 3);
  
  const verificationResults = [];
  
  console.log(`[VERIFY] Verifying 3 random MPs...`);
  for (const mp of randomMPs) {
    try {
      const apiDistrict = await getDistrictFromRepresent(mp.fullName, mp.office);
      const verification = {
        name: mp.fullName,
        office: mp.office,
        storedDistrict: mp.district_name,
        apiDistrict: apiDistrict,
        match: mp.district_name === apiDistrict
      };
      verificationResults.push(verification);
      
      console.log(`[VERIFY] MP ${mp.fullName}:`);
      console.log(`[VERIFY]   Stored: ${mp.district_name}`);
      console.log(`[VERIFY]   API: ${apiDistrict}`);
      console.log(`[VERIFY]   Match: ${verification.match ? '✓' : '✗'}`);
      
      await sleep(RATE_LIMIT_DELAY);
    } catch (error) {
      console.error(`[ERROR] Verification failed for MP ${mp.fullName}: ${error.message}`);
    }
  }
  
  console.log(`[VERIFY] Verifying 3 random MLAs...`);
  for (const mla of randomMLAs) {
    try {
      const apiDistrict = await getDistrictFromRepresent(mla.fullName, mla.office);
      const verification = {
        name: mla.fullName,
        office: mla.office,
        storedDistrict: mla.district_name,
        apiDistrict: apiDistrict,
        match: mla.district_name === apiDistrict
      };
      verificationResults.push(verification);
      
      console.log(`[VERIFY] MLA ${mla.fullName}:`);
      console.log(`[VERIFY]   Stored: ${mla.district_name}`);
      console.log(`[VERIFY]   API: ${apiDistrict}`);
      console.log(`[VERIFY]   Match: ${verification.match ? '✓' : '✗'}`);
      
      await sleep(RATE_LIMIT_DELAY);
    } catch (error) {
      console.error(`[ERROR] Verification failed for MLA ${mla.fullName}: ${error.message}`);
    }
  }
  
  return verificationResults;
}

/**
 * Print final statistics
 */
function printStats(verificationResults) {
  console.log('\n' + '='.repeat(60));
  console.log('ROSTER ENRICHMENT COMPLETE');
  console.log('='.repeat(60));
  
  console.log(`Total Officials: ${stats.total}`);
  console.log(`MPs: ${stats.mps} (${stats.mpsEnriched} enriched)`);
  console.log(`MLAs: ${stats.mlas} (${stats.mlasVerified} verified, ${stats.mlasUpdated} updated)`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Skipped: ${stats.skipped}`);
  
  console.log('\nVerification Results:');
  verificationResults.forEach(result => {
    const status = result.match ? '✓ MATCH' : '✗ MISMATCH';
    console.log(`  ${result.name} (${result.office}): ${status}`);
    if (!result.match) {
      console.log(`    Stored: ${result.storedDistrict}`);
      console.log(`    API: ${result.apiDistrict}`);
    }
  });
  
  if (errorLog.length > 0) {
    console.log('\nErrors encountered:');
    errorLog.forEach(error => console.log(`  - ${error}`));
  }
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('Starting Roster Enrichment Process...\n');
    
    // Load roster data
    const roster = loadRosterData();
    stats.total = roster.length;
    
    // Enrich MPs
    await enrichMPs(roster);
    
    // Verify MLAs
    await verifyMLAs(roster);
    
    // Save enriched data
    await saveEnrichedData(roster);
    
    // Verify results
    const verificationResults = await verifyResults(roster);
    
    // Print final statistics
    printStats(verificationResults);
    
    console.log('\nRoster enrichment completed successfully!');
    console.log(`\nEnriched data saved to: ${ENRICHED_FILE}`);
    console.log('Next step: Upload this file to Azure Blob Storage as data/officials.json');
    
  } catch (error) {
    console.error(`\n[FATAL ERROR] Roster enrichment failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  loadRosterData,
  getDistrictFromRepresent,
  enrichMPs,
  verifyMLAs,
  saveEnrichedData,
  verifyResults
};
