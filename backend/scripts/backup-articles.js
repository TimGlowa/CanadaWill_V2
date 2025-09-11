#!/usr/bin/env node

/**
 * Backup Articles Script
 * Creates a comprehensive backup of all article JSON files
 * Generates statistics and creates a zip archive
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ARTICLES_DIR = path.join(__dirname, '../_sep_out');
const BACKUP_DIR = path.join(__dirname, '../../articles-backup-2025-09-10');
const ARTICLES_BACKUP_DIR = path.join(BACKUP_DIR, 'articles');

function createBackupDirectory() {
  console.log('📁 Creating backup directory...');
  
  if (fs.existsSync(BACKUP_DIR)) {
    console.log('⚠️  Backup directory already exists. Removing...');
    fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  }
  
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.mkdirSync(ARTICLES_BACKUP_DIR, { recursive: true });
  
  console.log(`✅ Created backup directory: ${BACKUP_DIR}`);
}

function analyzeArticles() {
  console.log('📊 Analyzing articles...');
  
  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} article files`);
  
  const stats = {
    totalOfficials: files.length,
    officialsWithArticles: 0,
    officialsWithoutArticles: 0,
    totalArticles: 0,
    totalSize: 0,
    dateRange: { earliest: null, latest: null },
    sources: new Set(),
    officials: []
  };
  
  for (const file of files) {
    const filePath = path.join(ARTICLES_DIR, file);
    const fileStats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    
    try {
      const data = JSON.parse(content);
      const slug = data.slug || file.replace('.json', '');
      const name = data.name || 'Unknown';
      const articleCount = data.newsapi?.articles?.length || 0;
      
      stats.totalSize += fileStats.size;
      
      if (articleCount > 0) {
        stats.officialsWithArticles++;
        stats.totalArticles += articleCount;
        
        // Track date range
        data.newsapi.articles.forEach(article => {
          if (article.publishedAt) {
            const date = new Date(article.publishedAt);
            if (!stats.dateRange.earliest || date < stats.dateRange.earliest) {
              stats.dateRange.earliest = date;
            }
            if (!stats.dateRange.latest || date > stats.dateRange.latest) {
              stats.dateRange.latest = date;
            }
          }
          
          // Track sources
          if (article.source?.name) {
            stats.sources.add(article.source.name);
          }
        });
      } else {
        stats.officialsWithoutArticles++;
      }
      
      stats.officials.push({
        slug,
        name,
        articleCount,
        fileSize: fileStats.size,
        hasArticles: articleCount > 0
      });
      
    } catch (error) {
      console.error(`❌ Error parsing ${file}: ${error.message}`);
    }
  }
  
  // Convert Set to Array for JSON serialization
  stats.sources = Array.from(stats.sources);
  
  // Format date range
  if (stats.dateRange.earliest) {
    stats.dateRange.earliest = stats.dateRange.earliest.toISOString().split('T')[0];
  }
  if (stats.dateRange.latest) {
    stats.dateRange.latest = stats.dateRange.latest.toISOString().split('T')[0];
  }
  
  console.log('📈 Analysis complete:');
  console.log(`  Total Officials: ${stats.totalOfficials}`);
  console.log(`  Officials with Articles: ${stats.officialsWithArticles}`);
  console.log(`  Officials without Articles: ${stats.officialsWithoutArticles}`);
  console.log(`  Total Articles: ${stats.totalArticles}`);
  console.log(`  Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Date Range: ${stats.dateRange.earliest} to ${stats.dateRange.latest}`);
  console.log(`  Unique Sources: ${stats.sources.length}`);
  
  return stats;
}

function copyArticles(stats) {
  console.log('📋 Copying article files...');
  
  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.json'));
  let copied = 0;
  
  for (const file of files) {
    const sourcePath = path.join(ARTICLES_DIR, file);
    const destPath = path.join(ARTICLES_BACKUP_DIR, file);
    
    try {
      fs.copyFileSync(sourcePath, destPath);
      copied++;
      
      if (copied % 20 === 0) {
        console.log(`  Copied ${copied}/${files.length} files...`);
      }
    } catch (error) {
      console.error(`❌ Error copying ${file}: ${error.message}`);
    }
  }
  
  console.log(`✅ Copied ${copied} article files`);
}

function saveSummary(stats) {
  console.log('💾 Saving summary...');
  
  const summary = {
    backupDate: new Date().toISOString(),
    description: "Complete backup of article data for all 121 Alberta officials",
    statistics: stats,
    fileStructure: {
      articlesDirectory: "articles/",
      fileFormat: "JSON",
      namingConvention: "{slug}.json",
      totalFiles: stats.totalOfficials
    },
    usage: {
      restoreInstructions: "Extract zip file and process articles through sentiment analysis pipeline",
      integrationPoints: [
        "src/sentiment/sentimentAnalyzer.js",
        "stances/index.json",
        "Public dashboard for stance display"
      ]
    }
  };
  
  const summaryPath = path.join(BACKUP_DIR, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log(`✅ Summary saved to: ${summaryPath}`);
}

function copyReadme() {
  console.log('📄 Copying README...');
  
  const readmeSource = path.join(__dirname, '../../ARTICLES_BACKUP_README_2025-09-10.md');
  const readmeDest = path.join(BACKUP_DIR, 'README.md');
  
  if (fs.existsSync(readmeSource)) {
    fs.copyFileSync(readmeSource, readmeDest);
    console.log('✅ README copied');
  } else {
    console.log('⚠️  README not found, skipping...');
  }
}

function createZipArchive() {
  console.log('🗜️  Creating zip archive...');
  
  const zipPath = path.join(__dirname, '../../articles-backup-2025-09-10.zip');
  
  try {
    // Remove existing zip if it exists
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    
    // Create zip using system zip command
    execSync(`cd "${path.dirname(BACKUP_DIR)}" && zip -r "articles-backup-2025-09-10.zip" "articles-backup-2025-09-10"`, { stdio: 'inherit' });
    
    const zipStats = fs.statSync(zipPath);
    console.log(`✅ Zip archive created: ${zipPath}`);
    console.log(`   Size: ${(zipStats.size / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error(`❌ Error creating zip: ${error.message}`);
    console.log('📁 Backup directory available at:', BACKUP_DIR);
  }
}

function main() {
  console.log('🚀 Starting articles backup process...');
  console.log(`📂 Source directory: ${ARTICLES_DIR}`);
  console.log(`📦 Backup directory: ${BACKUP_DIR}`);
  console.log('');
  
  try {
    // Step 1: Create backup directory
    createBackupDirectory();
    
    // Step 2: Analyze articles
    const stats = analyzeArticles();
    
    // Step 3: Copy articles
    copyArticles(stats);
    
    // Step 4: Save summary
    saveSummary(stats);
    
    // Step 5: Copy README
    copyReadme();
    
    // Step 6: Create zip archive
    createZipArchive();
    
    console.log('');
    console.log('🎉 Articles backup completed successfully!');
    console.log('');
    console.log('📋 Backup contents:');
    console.log(`  📁 Directory: ${BACKUP_DIR}`);
    console.log(`  🗜️  Zip file: articles-backup-2025-09-10.zip`);
    console.log(`  📊 Summary: summary.json`);
    console.log(`  📄 Documentation: README.md`);
    console.log(`  📰 Articles: ${stats.totalOfficials} JSON files`);
    console.log('');
    console.log('✅ Ready for sentiment analysis processing!');
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };


