const express = require('express');
const app = express();

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test route working!' });
});

// Health route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Simple ingest working'
  });
});

// Test SERPHouse route
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

module.exports = app;
