#!/usr/bin/env node

const express = require('express');
const app = express();
const port = process.env.PORT || process.env.WEBSITES_PORT || 8080;

// Basic middleware
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ ok: true });
});

// Health route
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    bootPhase: 'ingest-loaded',
    uptimeMs: process.uptime() * 1000,
    ts: new Date().toISOString()
  });
});

// SERPHouse test route
app.get('/api/serp/test', (req, res) => {
  res.json({ 
    message: 'SERPHouse test route working!',
    timestamp: new Date().toISOString()
  });
});

// Sentiment Analyzer test route
app.get('/api/sentiment/test', async (req, res) => {
  try {
    // Test the SentimentAnalyzer class structure
    const SentimentAnalyzer = require('./src/sentiment/sentimentAnalyzer');
    
    // Test with sample data
    const sampleText = "Danielle Smith discusses federal health transfers and argues that Alberta should remain in Canada despite ongoing disputes with Ottawa.";
    
    const analyzer = new SentimentAnalyzer();
    const result = await analyzer.analyzeArticle(sampleText, 'Danielle Smith');
    
    res.json({
      message: 'SentimentAnalyzer test successful!',
      timestamp: new Date().toISOString(),
      testResult: result,
      classWorking: true
    });
    
  } catch (error) {
    res.status(500).json({
      message: 'SentimentAnalyzer test failed',
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      classWorking: false
    });
  }
});

// Catch-all for debugging
app.use('*', (req, res) => {
  res.json({ 
    error: 'Route not found', 
    path: req.originalUrl, 
    method: req.method,
    availableRoutes: ['/api/test', '/api/health', '/api/serp/test', '/api/sentiment/test']
  });
});

app.listen(port, () => {
  console.log(`Standalone Express app listening on port ${port}`);
  console.log(`Test routes:`);
  console.log(`  GET /api/test`);
  console.log(`  GET /api/health`);
  console.log(`  GET /api/serp/test`);
  console.log(`  GET /api/sentiment/test`);
});
