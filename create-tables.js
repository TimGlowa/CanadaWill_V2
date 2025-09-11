#!/usr/bin/env node

const fs = require('fs');

function createTable(filename, officialName) {
  try {
    const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const articles = data.raw || [];
    
    console.log(`\n${officialName.toUpperCase()} - ${articles.length} ARTICLES`);
    console.log('='.repeat(120));
    console.log('| #  | TITLE | DATE | SOURCE | URL | SNIPPET |');
    console.log('|----|-------|------|--------|-----|---------|');
    
    articles.forEach((article, index) => {
      const title = (article.title || 'No title').substring(0, 30) + '...';
      const date = article.time || 'No date';
      const source = (article.channel || 'No source').substring(0, 15);
      const url = (article.url || 'No URL').substring(0, 30) + '...';
      const snippet = (article.snippet || 'No snippet').substring(0, 40) + '...';
      
      console.log(`| ${(index + 1).toString().padStart(2)} | ${title.padEnd(30)} | ${date.padEnd(10)} | ${source.padEnd(15)} | ${url.padEnd(30)} | ${snippet.padEnd(40)} |`);
    });
    
    return articles.length;
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
    return 0;
  }
}

// Create tables for all three officials
const juliaCount = createTable('julia-hayter-articles.json', 'Julia Hayter');
const glennCount = createTable('glenn-vandijken-articles.json', 'Glenn van Dijken');
const stephanieCount = createTable('stephanie-kusie-articles.json', 'Stephanie Kusie');

console.log(`\n\nSUMMARY:`);
console.log(`Julia Hayter: ${juliaCount} articles`);
console.log(`Glenn van Dijken: ${glennCount} articles`);
console.log(`Stephanie Kusie: ${stephanieCount} articles`);
console.log(`Total: ${juliaCount + glennCount + stephanieCount} articles`);
