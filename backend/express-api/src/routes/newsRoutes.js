const express = require('express');
const router = express.Router();

/**
 * Simple status
 */
router.get('/status', (req, res) => {
  res.json({ ok: true, service: 'news', ts: new Date().toISOString() });
});

/**
 * POST /api/v1/news/ingest  (skeleton)
 * body: { slug: string }
 */
router.post('/ingest', (req, res) => {
  const { slug } = req.body || {};
  if (!slug) {
    return res.status(400).json({ ok: false, error: 'slug required' });
  }
  console.log(`Ingest request received for ${slug}`);
  res.json({ ok: true, slug });
});

module.exports = router; 