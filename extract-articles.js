#!/usr/bin/env node

const fs = require('fs');

function extractArticles(filename, officialName) {
  try {
    const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const articles = data.raw || [];
    
    console.log(`\n${officialName.toUpperCase()} - ${articles.length} ARTICLES`);
    console.log('='.repeat(80));
    
    articles.forEach((article, index) => {
      console.log(`\n${index + 1}. TITLE: ${article.title || 'No title'}`);
      console.log(`   DATE: ${article.time || 'No date'}`);
      console.log(`   SOURCE: ${article.channel || 'No source'}`);
      console.log(`   URL: ${article.url || 'No URL'}`);
      console.log(`   SNIPPET: ${article.snippet || 'No snippet'}`);
    });
    
    return articles.length;
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
    return 0;
  }
}

// Extract articles for all three officials
const juliaCount = extractArticles('julia-hayter-articles.json', 'Julia Hayter');
const glennCount = extractArticles('glenn-vandijken-articles.json', 'Glenn van Dijken');
const stephanieCount = extractArticles('stephanie-kusie-articles.json', 'Stephanie Kusie');

console.log(`\n\nSUMMARY:`);
console.log(`Julia Hayter: ${juliaCount} articles`);
console.log(`Glenn van Dijken: ${glennCount} articles`);
console.log(`Stephanie Kusie: ${stephanieCount} articles`);
console.log(`Total: ${juliaCount + glennCount + stephanieCount} articles`);
