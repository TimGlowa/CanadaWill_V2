#!/usr/bin/env node

/**
 * Deployment and Execution Script for Task 2 Backfill
 * 
 * This script helps deploy the enhanced query builder and backfill scripts to Azure
 * and provides commands to run them in the Azure environment.
 */

const fs = require('fs').promises;
const path = require('path');

class DeploymentHelper {
  constructor() {
    this.azureEndpoint = 'https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net';
    this.scripts = [
      'test-enhanced-query-builder.js',
      'test-backfill.js', 
      '12-month-backfill.js',
      'verify-backfill.js'
    ];
  }

  async generateDeploymentInstructions() {
    console.log('🚀 Task 2 Deployment Instructions for Azure\n');
    
    console.log('📋 Files to Deploy:');
    console.log('==================');
    console.log('✅ Enhanced Query Builder:');
    console.log('   - backend/express-ingest/src/providers/serphouseClient.js');
    console.log('   - backend/express-ingest/src/providers/serphouseClient.ts');
    console.log('');
    console.log('✅ Backfill Scripts:');
    this.scripts.forEach(script => {
      console.log(`   - backend/express-ingest/scripts/${script}`);
    });
    console.log('');

    console.log('🔧 Azure Deployment Steps:');
    console.log('==========================');
    console.log('1. Commit and push changes to GitHub:');
    console.log('   git add .');
    console.log('   git commit -m "Task 2: Enhanced SERPHouse query builder and 12-month backfill"');
    console.log('   git push origin main');
    console.log('');
    console.log('2. Wait for GitHub Actions deployment to complete');
    console.log('');
    console.log('3. Verify deployment by checking Azure App Service logs');
    console.log('');

    console.log('🧪 Testing Commands (Run on Azure):');
    console.log('===================================');
    console.log('Test 1: Enhanced Query Builder');
    console.log(`   curl -X GET "${this.azureEndpoint}/api/news/serp/vendor-probe"`);
    console.log('');
    console.log('Test 2: Test Backfill (3 officials, 7 days)');
    console.log(`   curl -X POST "${this.azureEndpoint}/api/ingest/run" \\`);
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"test": true, "officials": 3, "days": 7}\'');
    console.log('');
    console.log('Test 3: Full Backfill (121 officials, 365 days)');
    console.log(`   curl -X POST "${this.azureEndpoint}/api/ingest/run" \\`);
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"full": true, "officials": 121, "days": 365}\'');
    console.log('');

    console.log('📊 Verification Commands:');
    console.log('=========================');
    console.log('Check backfill progress:');
    console.log(`   curl -X GET "${this.azureEndpoint}/api/ingest/status"`);
    console.log('');
    console.log('Verify sample results:');
    console.log(`   curl -X GET "${this.azureEndpoint}/api/ingest/verify"`);
    console.log('');

    console.log('🔍 Monitoring:');
    console.log('==============');
    console.log('Azure App Service Logs:');
    console.log(`   https://canadawill-ingest-ave2f8fjcxeuaehz.scm.canadacentral-01.azurewebsites.net/api/logs/docker`);
    console.log('');
    console.log('Azure Portal:');
    console.log(`   https://portal.azure.com/#resource/subscriptions/b7b79fc8-495f-4b96-a30d-f59665aa3b7f/resourceGroups/CanadaWill-prod2-rg/providers/Microsoft.Web/sites/canadawill-ingest`);
    console.log('');

    console.log('⚠️  Important Notes:');
    console.log('====================');
    console.log('• Environment variables (SERPHOUSE_API_TOKEN, AZURE_STORAGE_CONNECTION) are already configured in Azure');
    console.log('• The backfill will process ~44,000 queries (121 officials × 365 days)');
    console.log('• Estimated runtime: 3-4 hours with 300ms rate limiting');
    console.log('• Checkpointing is enabled - can resume if interrupted');
    console.log('• Results stored in Azure Blob Storage: articles/raw/serp/{slug}/{YYYY-MM-DD}.json');
    console.log('');

    console.log('🎯 Success Criteria:');
    console.log('====================');
    console.log('✅ Enhanced queries include full name AND title variants AND keywords');
    console.log('✅ All 121 officials processed successfully');
    console.log('✅ 12-month historical data collected');
    console.log('✅ Results stored in correct Azure Blob Storage paths');
    console.log('✅ Verification shows >80% success rate');
    console.log('');

    // Generate a deployment checklist
    await this.generateChecklist();
  }

  async generateChecklist() {
    const checklist = {
      deployment: [
        'Enhanced query builder deployed to Azure',
        'Backfill scripts deployed to Azure', 
        'GitHub Actions deployment completed',
        'Azure App Service health check passed'
      ],
      testing: [
        'Enhanced query builder test passed',
        'Test backfill (3 officials, 7 days) completed',
        'Sample verification shows correct query structure',
        'Azure Blob Storage integration working'
      ],
      execution: [
        'Full backfill (121 officials, 365 days) started',
        'Checkpointing enabled and working',
        'Rate limiting respected (300ms delays)',
        'Progress monitoring in place'
      ],
      verification: [
        'Verification script completed',
        '>80% success rate achieved',
        'Sample files show relevant articles',
        'Azure Blob Storage paths correct'
      ]
    };

    const checklistPath = path.join(__dirname, '../data/deployment-checklist.json');
    await fs.writeFile(checklistPath, JSON.stringify(checklist, null, 2));
    
    console.log('📋 Deployment checklist saved to: deployment-checklist.json');
    console.log('   Use this to track progress through the deployment and testing phases');
  }

  async generateApiEndpoints() {
    console.log('\n🔌 API Endpoints for Task 2:');
    console.log('=============================');
    
    const endpoints = {
      health: `${this.azureEndpoint}/api/health`,
      vendorProbe: `${this.azureEndpoint}/api/news/serp/vendor-probe`,
      testBackfill: `${this.azureEndpoint}/api/ingest/test-backfill`,
      fullBackfill: `${this.azureEndpoint}/api/ingest/run`,
      status: `${this.azureEndpoint}/api/ingest/status`,
      verify: `${this.azureEndpoint}/api/ingest/verify`
    };

    Object.entries(endpoints).forEach(([name, url]) => {
      console.log(`${name}: ${url}`);
    });

    const endpointsPath = path.join(__dirname, '../data/api-endpoints.json');
    await fs.writeFile(endpointsPath, JSON.stringify(endpoints, null, 2));
    
    console.log('\n💾 API endpoints saved to: api-endpoints.json');
  }
}

// Main execution
async function main() {
  try {
    const helper = new DeploymentHelper();
    await helper.generateDeploymentInstructions();
    await helper.generateApiEndpoints();
    
    console.log('\n🎉 Deployment instructions generated successfully!');
    console.log('📁 Check the generated files in the data/ directory');
  } catch (error) {
    console.error('\n💥 Error generating deployment instructions:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { DeploymentHelper };
