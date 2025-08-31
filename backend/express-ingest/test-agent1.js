#!/usr/bin/env node

/**
 * Test script for Agent 1 (Relevance Gate)
 * Run this to verify the AI prompts are working correctly
 */

require('dotenv').config();
const SentimentAnalyzer = require('./src/sentiment/sentimentAnalyzer');

async function testAgent1() {
  console.log('🧪 Testing Agent 1 (Relevance Gate) Implementation');
  console.log('==================================================\n');

  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   AZURE_STORAGE_CONNECTION: ${process.env.AZURE_STORAGE_CONNECTION ? '✅ Set' : '❌ Missing'}`);
  console.log('');

  // Initialize analyzer
  const analyzer = new SentimentAnalyzer();
  
  // Test cases with different types of content
  const testCases = [
    {
      name: 'Danielle Smith',
      text: 'Premier Danielle Smith said Alberta needs a fair deal from Ottawa and will consider all options including greater autonomy if the federal government continues to ignore provincial concerns.',
      expectedPass: true
    },
    {
      name: 'Danielle Smith',
      text: 'Premier Smith announced new funding for local hospitals and praised healthcare workers for their dedication during the pandemic.',
      expectedPass: false
    },
    {
      name: 'Ric McIver',
      text: 'MLA Ric McIver stated that Alberta should remain part of Canada but needs better representation in federal decision-making processes.',
      expectedPass: true
    },
    {
      name: 'Ric McIver',
      text: 'Ric McIver attended the local farmers market and discussed agricultural policy with constituents.',
      expectedPass: false
    }
  ];

  console.log('🧪 Running Test Cases:');
  console.log('=======================\n');

  let passedTests = 0;
  let totalTests = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`Test ${i + 1}/${totalTests}: ${testCase.name}`);
    
    try {
      const result = await analyzer.testAgent1(testCase.text, testCase.name);
      
      // Check if result matches expectation
      const testPassed = result.passed === testCase.expectedPass;
      if (testPassed) {
        console.log(`   ✅ Test PASSED - Expected: ${testCase.expectedPass}, Got: ${result.passed}`);
        passedTests++;
      } else {
        console.log(`   ❌ Test FAILED - Expected: ${testCase.expectedPass}, Got: ${result.passed}`);
        console.log(`   Reason: ${result.reason}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Test ERROR: ${error.message}`);
    }
    
    console.log(''); // Spacing
  }

  // Summary
  console.log('📊 Test Summary:');
  console.log('================');
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${totalTests - passedTests}`);
  console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Agent 1 is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the implementation.');
  }
}

// Run the test
if (require.main === module) {
  testAgent1().catch(error => {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testAgent1 };
