const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

// CORS enabled for all origins
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// News ingest endpoint - accepts both GET and POST
app.all('/api/news/ingest', (req, res) => {
  const slug = req.query.slug || req.body?.slug;
  
  if (!slug) {
    return res.status(400).json({
      ok: false,
      error: 'slug required'
    });
  }

  res.json({
    ok: true,
    slug: slug
  });
});

// Catch-all route for debugging
app.use('*', (req, res) => {
  console.log(`Unhandled route: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

app.listen(port, () => {
  console.log(`Express server running on port ${port}`);
}); 