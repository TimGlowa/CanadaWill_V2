#!/usr/bin/env node

/**
 * Save Enriched Roster Data
 * Saves the enriched roster data locally and provides instructions for Azure upload
 */

const fs = require('fs');
const path = require('path');

// Load the enriched roster data
const ROSTER_FILE = path.join(__dirname, '../data/ab-roster-transformed.json');

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

function createEnrichedData(roster) {
  // Count statistics
  const stats = {
    total: roster.length,
    mps: roster.filter(o => o.office === 'Member of Parliament').length,
    mlas: roster.filter(o => o.office === 'Member of Legislative Assembly').length,
    mpsWithDistrict: roster.filter(o => o.office === 'Member of Parliament' && o.district_name).length,
    mlasWithDistrict: roster.filter(o => o.office === 'Member of Legislative Assembly' && o.district_name).length,
    mpsWithoutDistrict: roster.filter(o => o.office === 'Member of Parliament' && !o.district_name).length,
    mlasWithoutDistrict: roster.filter(o => o.office === 'Member of Legislative Assembly' && !o.district_name).length
  };
  
  const enrichedData = {
    officials: roster,
    metadata: {
      lastUpdated: new Date().toISOString(),
      totalOfficials: stats.total,
      mps: stats.mps,
      mlas: stats.mlas,
      mpsWithDistrict: stats.mpsWithDistrict,
      mlasWithDistrict: stats.mlasWithDistrict,
      mpsWithoutDistrict: stats.mpsWithoutDistrict,
      mlasWithoutDistrict: stats.mlasWithoutDistrict,
      coverage: {
        mps: `${Math.round((stats.mpsWithDistrict / stats.mps) * 100)}%`,
        mlas: `${Math.round((stats.mlasWithDistrict / stats.mlas) * 100)}%`,
        overall: `${Math.round(((stats.mpsWithDistrict + stats.mlasWithDistrict) / stats.total) * 100)}%`
      }
    }
  };
  
  return enrichedData;
}

function saveLocally(enrichedData) {
  const outputPath = path.join(__dirname, '../data/officials.json');
  
  try {
    console.log(`[SAVE] Saving enriched data locally to: ${outputPath}`);
    
    const jsonString = JSON.stringify(enrichedData, null, 2);
    fs.writeFileSync(outputPath, jsonString, 'utf8');
    
    console.log(`[SAVE] ✓ Successfully saved enriched data locally`);
    return outputPath;
    
  } catch (error) {
    console.error(`[ERROR] Failed to save enriched data locally: ${error.message}`);
    throw error;
  }
}

function printSummary(enrichedData) {
  const { officials, metadata } = enrichedData;
  
  console.log('\n' + '='.repeat(60));
  console.log('ENRICHED ROSTER DATA SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`Total Officials: ${metadata.totalOfficials}`);
  console.log(`MPs: ${metadata.mps} (${metadata.mpsWithDistrict} with districts, ${metadata.mpsWithoutDistrict} missing)`);
  console.log(`MLAs: ${metadata.mlas} (${metadata.mlasWithDistrict} with districts, ${metadata.mlasWithoutDistrict} missing)`);
  console.log(`Coverage: ${metadata.coverage.overall} overall`);
  
  console.log('\nMPs without district information:');
  officials
    .filter(o => o.office === 'Member of Parliament' && !o.district_name)
    .forEach(mp => console.log(`  - ${mp.fullName}`));
  
  console.log('\nMLAs without district information:');
  officials
    .filter(o => o.office === 'Member of Legislative Assembly' && !o.district_name)
    .forEach(mla => console.log(`  - ${mla.fullName}`));
  
  console.log('\nSample enriched records:');
  console.log('\nMP Example:');
  const sampleMP = officials.find(o => o.office === 'Member of Parliament' && o.district_name);
  if (sampleMP) {
    console.log(`  Name: ${sampleMP.fullName}`);
    console.log(`  District: ${sampleMP.district_name}`);
    console.log(`  Office: ${sampleMP.office}`);
  }
  
  console.log('\nMLA Example:');
  const sampleMLA = officials.find(o => o.office === 'Member of Legislative Assembly' && o.district_name);
  if (sampleMLA) {
    console.log(`  Name: ${sampleMLA.fullName}`);
    console.log(`  District: ${sampleMLA.district_name}`);
    console.log(`  Office: ${sampleMLA.office}`);
  }
  
  console.log('\n' + '='.repeat(60));
}

function main() {
  try {
    console.log('Creating Enriched Roster Data...\n');
    
    // Load roster data
    const roster = loadRosterData();
    
    // Create enriched data structure
    const enrichedData = createEnrichedData(roster);
    
    // Save locally
    const outputPath = saveLocally(enrichedData);
    
    // Print summary
    printSummary(enrichedData);
    
    console.log(`\nNext steps:`);
    console.log(`1. Review the enriched data at: ${outputPath}`);
    console.log(`2. Upload to Azure Blob Storage as: data/officials.json`);
    console.log(`3. The data is ready for use in subsequent tasks`);
    
  } catch (error) {
    console.error(`\n[FATAL ERROR] Failed to create enriched data: ${error.message}`);
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
  createEnrichedData,
  saveLocally,
  printSummary
};
