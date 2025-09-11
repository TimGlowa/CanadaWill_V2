#!/usr/bin/env node

/**
 * Test script for Phase A Relevance Screening
 * 
 * This script tests the relevance screening pipeline with a small sample
 * to validate the full end-to-end flow before running on all ~170k articles.
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const TEST_ARTICLE_LIMIT = 10;

async function testRelevanceScreening() {
  console.log('🧪 Testing Phase A Relevance Screening Pipeline');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📊 Test limit: ${TEST_ARTICLE_LIMIT} articles`);
  console.log('');

  try {
    // Step 1: Check if service is running
    console.log('1️⃣ Checking service health...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log(`✅ Service is healthy: ${healthResponse.data.message}`);
    console.log('');

    // Step 2: Check current status
    console.log('2️⃣ Checking current relevance status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/relevance/status`);
    console.log('📊 Current status:', JSON.stringify(statusResponse.data, null, 2));
    console.log('');

    // Step 3: Run test with limited articles
    console.log(`3️⃣ Running relevance screening test with ${TEST_ARTICLE_LIMIT} articles...`);
    const testResponse = await axios.post(`${BASE_URL}/api/relevance/test`, {
      limit: TEST_ARTICLE_LIMIT
    });
    
    if (testResponse.data.success) {
      console.log('✅ Test completed successfully!');
      console.log('📊 Test results:', JSON.stringify(testResponse.data.result, null, 2));
    } else {
      console.log('❌ Test failed:', testResponse.data.error);
      return;
    }
    console.log('');

    // Step 4: Check final status
    console.log('4️⃣ Checking final status...');
    const finalStatusResponse = await axios.get(`${BASE_URL}/api/relevance/status`);
    console.log('📊 Final status:', JSON.stringify(finalStatusResponse.data, null, 2));
    console.log('');

    // Step 5: Summary
    const finalStatus = finalStatusResponse.data;
    console.log('🎉 TEST SUMMARY');
    console.log('================');
    console.log(`✅ Test Mode: ${finalStatus.testMode ? 'Yes' : 'No'}`);
    console.log(`📊 Total Articles: ${finalStatus.total}`);
    console.log(`✅ Processed: ${finalStatus.processed}`);
    console.log(`⏳ Pending: ${finalStatus.pending}`);
    console.log(`❌ Errors: ${finalStatus.errors}`);
    console.log(`🕒 Duration: ${finalStatus.startedAt ? new Date(finalStatus.updatedAt) - new Date(finalStatus.startedAt) : 'N/A'}ms`);
    
    if (finalStatus.processed > 0 && finalStatus.errors === 0) {
      console.log('');
      console.log('🎯 SUCCESS: Pipeline is working correctly!');
      console.log('📋 Next steps:');
      console.log('   1. Run full screening: POST /api/relevance/start');
      console.log('   2. Monitor progress: GET /api/relevance/status');
      console.log('   3. Check output files in Azure Blob Storage');
    } else {
      console.log('');
      console.log('⚠️  WARNING: Test completed but with issues');
      console.log('🔍 Check logs for details');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📄 Response status:', error.response.status);
      console.error('📄 Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testRelevanceScreening()
    .then(() => {
      console.log('');
      console.log('✅ Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testRelevanceScreening };
