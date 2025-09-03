#!/usr/bin/env node

/**
 * Analyze Missing District Information
 * Identifies all officials missing district information
 */

const fs = require('fs');
const path = require('path');

const OFFICIALS_FILE = path.join(__dirname, '../data/officials.json');

function analyzeMissing() {
  try {
    console.log('Loading officials data...\n');
    
    const data = JSON.parse(fs.readFileSync(OFFICIALS_FILE, 'utf8'));
    const officials = data.officials;
    
    console.log('='.repeat(80));
    console.log('OFFICIALS MISSING DISTRICT INFORMATION ANALYSIS');
    console.log('='.repeat(80));
    
    // MPs without district information
    const mpsWithoutDistrict = officials.filter(o => 
      o.office === 'Member of Parliament' && !o.district_name
    );
    
    console.log(`\nMPs WITHOUT DISTRICT INFORMATION (${mpsWithoutDistrict.length}):`);
    console.log('-'.repeat(50));
    mpsWithoutDistrict.forEach((mp, i) => {
      console.log(`${i + 1}. ${mp.fullName}`);
      console.log(`   Slug: ${mp.slug}`);
      console.log(`   Riding: ${mp.riding || 'null'}`);
      console.log('');
    });
    
    // MLAs without district information
    const mlasWithoutDistrict = officials.filter(o => 
      o.office === 'Member of Legislative Assembly' && !o.district_name
    );
    
    console.log(`\nMLAs WITHOUT DISTRICT INFORMATION (${mlasWithoutDistrict.length}):`);
    console.log('-'.repeat(50));
    mlasWithoutDistrict.forEach((mla, i) => {
      console.log(`${i + 1}. ${mla.fullName}`);
      console.log(`   Slug: ${mla.slug}`);
      console.log(`   Riding: ${mla.riding || 'null'}`);
      console.log('');
    });
    
    // Summary statistics
    const totalOfficials = officials.length;
    const totalMPs = officials.filter(o => o.office === 'Member of Parliament').length;
    const totalMLAs = officials.filter(o => o.office === 'Member of Legislative Assembly').length;
    const mpsWithDistrict = officials.filter(o => 
      o.office === 'Member of Parliament' && o.district_name
    ).length;
    const mlasWithDistrict = officials.filter(o => 
      o.office === 'Member of Legislative Assembly' && o.district_name
    ).length;
    
    console.log('='.repeat(80));
    console.log('SUMMARY STATISTICS');
    console.log('='.repeat(80));
    console.log(`Total Officials: ${totalOfficials}`);
    console.log(`MPs: ${totalMPs} (${mpsWithDistrict} with districts, ${mpsWithoutDistrict.length} missing)`);
    console.log(`MLAs: ${totalMLAs} (${mlasWithDistrict} with districts, ${mlasWithoutDistrict.length} missing)`);
    console.log(`Total Missing: ${mpsWithoutDistrict.length + mlasWithoutDistrict.length}`);
    console.log(`Overall Coverage: ${Math.round(((mpsWithDistrict + mlasWithDistrict) / totalOfficials) * 100)}%`);
    
    // Potential issues analysis
    console.log('\n' + '='.repeat(80));
    console.log('POTENTIAL ISSUES ANALYSIS');
    console.log('='.repeat(80));
    
    // Check for officials with special characters or titles
    const specialCases = officials.filter(o => 
      !o.district_name && (
        o.fullName.includes(',') || 
        o.fullName.includes('KC') || 
        o.fullName.includes('Member-elect') ||
        o.fullName.includes('-')
      )
    );
    
    if (specialCases.length > 0) {
      console.log('\nOfficials with special characters/titles that might cause API issues:');
      specialCases.forEach(o => {
        console.log(`- ${o.fullName} (${o.office})`);
      });
    }
    
    // Check for officials with common names
    const commonNames = {};
    officials.filter(o => !o.district_name).forEach(o => {
      const lastName = o.fullName.split(' ').pop();
      commonNames[lastName] = (commonNames[lastName] || 0) + 1;
    });
    
    const veryCommonNames = Object.entries(commonNames)
      .filter(([name, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);
    
    if (veryCommonNames.length > 0) {
      console.log('\nOfficials with potentially common last names:');
      veryCommonNames.forEach(([name, count]) => {
        console.log(`- ${name}: ${count} officials`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error(`Error analyzing missing officials: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  analyzeMissing();
}

module.exports = { analyzeMissing };
