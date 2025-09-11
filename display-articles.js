#!/usr/bin/env node

const fs = require('fs');

function displayArticles(filename, officialName) {
  try {
    const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const articles = data.raw || [];
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`${officialName.toUpperCase()} - ${articles.length} ARTICLES`);
    console.log(`${'='.repeat(80)}\n`);
    
    articles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title || 'No title'}`);
      console.log(`   Date: ${article.time || 'No date'}`);
      console.log(`   Source: ${article.channel || 'No source'}`);
      console.log(`   URL: ${article.url || 'No URL'}`);
      console.log(`   Snippet: ${article.snippet || 'No snippet'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
  }
}

// Display all articles for the three officials
displayArticles('julia-hayter-articles.json', 'Julia Hayter');
displayArticles('glenn-vandijken-articles.json', 'Glenn van Dijken');
displayArticles('stephanie-kusie-articles.json', 'Stephanie Kusie');
