#!/usr/bin/env node

const express = require('express');
const app = express();
const port = process.env.PORT || process.env.WEBSITES_PORT || 8080;

// Basic middleware
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Standalone app working!', timestamp: new Date().toISOString() });
});

// Health route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Standalone ingest working'
  });
});

// SERPHouse test route
app.get('/api/serp/test', (req, res) => {
  res.json({ 
    message: 'SERPHouse test route working!',
    timestamp: new Date().toISOString()
  });
});

// Catch-all for debugging
app.use('*', (req, res) => {
  res.json({ 
    error: 'Route not found', 
    path: req.originalUrl, 
    method: req.method,
    availableRoutes: ['/api/test', '/api/health', '/api/serp/test']
  });
});

app.listen(port, () => {
  console.log(`Standalone Express app listening on port ${port}`);
  console.log(`Test routes:`);
  console.log(`  GET /api/test`);
  console.log(`  GET /api/health`);
  console.log(`  GET /api/serp/test`);
});
