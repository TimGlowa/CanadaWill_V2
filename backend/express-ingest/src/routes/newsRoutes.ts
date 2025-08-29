import { Router } from 'express';
import { IngestOrchestrator } from '../ingest/orchestrator';

const router = Router();
const orchestrator = new IngestOrchestrator();

// GET /api/news/status - Returns provider status and budget information
router.get('/api/news/status', (req, res) => {
  try {
    const status = orchestrator.getStatus();
    res.json({
      ok: true,
      ...status
    });
  } catch (error) {
    console.error('Status endpoint error:', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/news/ingest - Runs ingest for a single slug
router.post('/api/news/ingest', async (req, res) => {
  try {
    const { slug, windowDays = 3 } = req.body;
    
    // Input validation
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'slug is required and must be a string'
      });
    }
    
    if (windowDays && (typeof windowDays !== 'number' || windowDays < 1 || windowDays > 30)) {
      return res.status(400).json({
        ok: false,
        error: 'windowDays must be a number between 1 and 30'
      });
    }

    console.log(`Single ingest request: slug=${slug}, windowDays=${windowDays}`);
    
    const summary = await orchestrator.ingestOne(slug, windowDays);
    
    res.json({
      ok: true,
      summary
    });
  } catch (error: any) {
    console.error('Single ingest endpoint error:', error);
    
    if (error.message && error.message.includes('not found in roster')) {
      return res.status(404).json({
        ok: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      ok: false,
      error: error.message || 'Internal server error'
    });
  }
});

// POST /admin/ingest/run - Runs batch ingest for multiple slugs
router.post('/admin/ingest/run', async (req, res) => {
  try {
    const { cohort, slugs, windowDays = 3, concurrency = 5, dryRun = false } = req.body;
    
    // Input validation
    if (!cohort && !slugs) {
      return res.status(400).json({
        ok: false,
        error: 'Either cohort or slugs array is required'
      });
    }
    
    if (cohort && cohort !== 'ab-all') {
      return res.status(400).json({
        ok: false,
        error: 'Only "ab-all" cohort is supported'
      });
    }
    
    if (slugs && (!Array.isArray(slugs) || slugs.length === 0)) {
      return res.status(400).json({
        ok: false,
        error: 'slugs must be a non-empty array'
      });
    }
    
    if (windowDays && (typeof windowDays !== 'number' || windowDays < 1 || windowDays > 30)) {
      return res.status(400).json({
        ok: false,
        error: 'windowDays must be a number between 1 and 30'
      });
    }
    
    if (concurrency && (typeof concurrency !== 'number' || concurrency < 1 || concurrency > 20)) {
      return res.status(400).json({
        ok: false,
        error: 'concurrency must be a number between 1 and 20'
      });
    }

    // Determine slugs to process
    let slugsToProcess: string[];
    if (cohort === 'ab-all') {
      // Load all slugs from roster
      const roster = require('../../data/ab-roster.json');
      slugsToProcess = roster.map((p: any) => p.slug);
    } else {
      slugsToProcess = slugs;
    }

    console.log(`Batch ingest request: ${slugsToProcess.length} slugs, windowDays=${windowDays}, concurrency=${concurrency}, dryRun=${dryRun}`);
    
    const result = await orchestrator.ingestBatch({
      slugs: slugsToProcess,
      windowDays,
      concurrency,
      dryRun
    });
    
    res.json({
      ok: true,
      result
    });
  } catch (error: any) {
    console.error('Batch ingest endpoint error:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Internal server error'
    });
  }
});

// GET /api/news/articles/:slug - Retrieve stored articles for a specific person
router.get('/api/news/articles/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({
        ok: false,
        error: 'Slug parameter is required'
      });
    }

    // Check if slug exists in roster
    const roster = require('../../data/ab-roster.json');
    const person = roster.find((p: any) => p.slug === slug);
    
    if (!person) {
      return res.status(404).json({
        ok: false,
        error: `Person with slug '${slug}' not found in roster`
      });
    }

    // Get the orchestrator instance to access storage
    const { IngestOrchestrator } = require('../ingest/orchestrator');
    const orchestrator = new IngestOrchestrator();
    
    // Retrieve articles from storage
    const articles = await orchestrator.getArticlesBySlug(slug);
    
    res.json({
      ok: true,
      person: {
        slug: person.slug,
        fullName: person.fullName,
        office: person.office,
        riding: person.riding,
        city: person.city
      },
      articles: articles
    });

  } catch (error: any) {
    console.error('Article retrieval endpoint error:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Internal server error'
    });
  }
});

export default router; 