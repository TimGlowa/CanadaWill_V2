#!/usr/bin/env node

const fs = require('fs');

function createPersonTable(filename, personName) {
  try {
    const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const articles = data.raw || [];
    
    console.log(`\n${personName.toUpperCase()} - ${articles.length} ARTICLES`);
    console.log('='.repeat(150));
    console.log('| Person Name | Title | URL | Snippet |');
    console.log('|-------------|-------|-----|---------|');
    
    articles.forEach((article, index) => {
      const person = personName;
      const title = (article.title || 'No title').substring(0, 50);
      const url = (article.url || 'No URL').substring(0, 50);
      const snippet = (article.snippet || 'No snippet').substring(0, 60);
      
      console.log(`| ${person.padEnd(11)} | ${title.padEnd(50)} | ${url.padEnd(50)} | ${snippet.padEnd(60)} |`);
    });
    
    return articles.length;
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
    return 0;
  }
}

// Create tables for all three officials
const juliaCount = createPersonTable('julia-hayter-articles.json', 'Julia Hayter');
const glennCount = createPersonTable('glenn-vandijken-articles.json', 'Glenn van Dijken');
const stephanieCount = createPersonTable('stephanie-kusie-articles.json', 'Stephanie Kusie');

console.log(`\n\nSUMMARY:`);
console.log(`Julia Hayter: ${juliaCount} articles`);
console.log(`Glenn van Dijken: ${glennCount} articles`);
console.log(`Stephanie Kusie: ${stephanieCount} articles`);
console.log(`Total: ${juliaCount + glennCount + stephanieCount} articles`);
