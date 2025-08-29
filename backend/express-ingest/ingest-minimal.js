const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Minimal app working!', timestamp: new Date().toISOString() });
});

// Health route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Minimal ingest working'
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

module.exports = app;
