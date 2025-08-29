#!/usr/bin/env node

// Simple test script for SERPHouse integration
const fs = require('fs');
const path = require('path');

// Test data loading
console.log('🧪 Testing SERPHouse Integration...\n');

// Test 1: Load roster
console.log('1. Testing roster loading...');
try {
  const rosterPath = path.join(__dirname, 'data', 'ab-reps.json');
  const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
  console.log(`   ✅ Roster loaded: ${roster.length} people`);
  console.log(`   📋 Sample: ${roster[0].fullName} (${roster[0].level}) - ${roster[0].riding}`);
} catch (error) {
  console.log(`   ❌ Roster load failed: ${error.message}`);
}

// Test 2: Load weeklies
console.log('\n2. Testing weeklies loading...');
try {
  const weekliesPath = path.join(__dirname, 'data', 'ab-weeklies.json');
  const weeklies = JSON.parse(fs.readFileSync(weekliesPath, 'utf8'));
  console.log(`   ✅ Weeklies loaded: ${weeklies.length} domains`);
  console.log(`   📋 Sample: ${weeklies.slice(0, 3).join(', ')}`);
} catch (error) {
  console.log(`   ❌ Weeklies load failed: ${error.message}`);
}

// Test 3: Check environment variables
console.log('\n3. Testing environment variables...');
const requiredVars = [
  'SERPHOUSE_API_TOKEN',
  'AZURE_STORAGE_CONNECTION',
  'ARTICLES_CONTAINER'
];

const optionalVars = [
  'SERP_MAX_CONCURRENCY',
  'SERP_DELAY_MS', 
  'SERP_PAGE_MAX'
];

console.log('   Required:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`     ✅ ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`     ❌ ${varName}: NOT SET`);
  }
});

console.log('   Optional:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`     ✅ ${varName}: ${value}`);
  } else {
    console.log(`     ⚠️  ${varName}: using default`);
  }
});

// Test 4: Check file structure
console.log('\n4. Testing file structure...');
const requiredFiles = [
  'src/providers/serphouseClient.js',
  'src/services/azureStorageService.js',
  'ingest.js'
];

requiredFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✅ ${filePath}`);
  } else {
    console.log(`   ❌ ${filePath} - MISSING`);
  }
});

console.log('\n🎯 SERPHouse Integration Test Complete!');
console.log('\nNext steps:');
console.log('1. Deploy to Azure App Service');
console.log('2. Test endpoints:');
console.log('   - GET /api/serp/backfill?only=danielle-smith&days=7&limit=10');
console.log('   - GET /api/serp/refresh?scope=mlas&hours=24&limit=10');
console.log('3. Check Azure Blob Storage for captured articles');
