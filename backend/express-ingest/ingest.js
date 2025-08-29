const express = require('express');
const fs = require('fs');
const path = require('path');

// B) Top-level logging
console.log('[INGEST] module top-level executing');

const app = express();

// Prove which file is serving + mount SERP routes
app.get('/api/whoami', (_req,res)=>res.json({ file: __filename }));
try {
  require('./serp-tools.runtime')(app);
  console.log('[SERP tools] routes mounted');
} catch (e) {
  console.error('[SERP tools] mount failed', e);
}

// Import services
const SerphouseClient = require('./src/providers/serphouseClient');
const AzureStorageService = require('./src/services/azureStorageService');

// News router removed - not needed for SERPHouse integration

// /api/health
app.get('/api/health', (_req,res)=>res.json({status:'healthy',timestamp:new Date().toISOString()}));

// /api/buildinfo - read from app root (same folder as server.js)
app.get('/api/buildinfo', (_req,res) => {
  try {
    const p = path.join(__dirname,'..','buildinfo.json');
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p,'utf-8');
      return res.json(JSON.parse(content));
    }
    res.status(404).json({ error: 'buildinfo.json not found', path: p });
  } catch (error) {
    console.error('Error reading buildinfo.json:', error);
    res.status(500).json({ error: 'Failed to read buildinfo.json', details: error.message });
  }
});

// /api/routes - enumerate all registered routes
app.get('/api/routes', (_req,res) => {
  try {
    const routes = [];
    
    // Get routes from main app
    if (app._router && app._router.stack) {
      app._router.stack.forEach(layer => {
        if (layer.route && layer.route.path) {
          const methods = Object.keys(layer.route.methods);
          methods.forEach(method => {
            routes.push({ 
              method: method.toUpperCase(), 
              path: layer.route.path 
            });
          });
        }
      });
    }
    
    // Sort routes for consistent output
    routes.sort((a,b) => (a.path + a.method).localeCompare(b.path + b.method));
    
    res.json({ 
      count: routes.length, 
      routes,
      note: 'Includes mounted routers and main app routes'
    });
  } catch (error) {
    console.error('Error enumerating routes:', error);
    res.status(500).json({ error: 'Failed to enumerate routes', details: error.message });
  }
});

// C) Minimal SERPHouse sanity route
app.get('/api/serp/ping', (_req, res) => {
  res.json({ ok: true, msg: 'serp alive' });
});

// /api/serp/backfill - 12 months backfill for Alberta MLAs/MPs
app.get('/api/serp/backfill', async (req, res) => {
  try {
    const { scope = 'mlas,mps', days = 365, limit = 50, only } = req.query;
    
    // Load roster
    const rosterPath = path.join(__dirname, 'data', 'ab-reps.json');
    if (!fs.existsSync(rosterPath)) {
      return res.status(500).json({ error: 'Roster file not found', path: rosterPath });
    }
    
    const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
    
    // Initialize clients with environment variables
    const serphouseClient = new SerphouseClient(
      process.env.SERPHOUSE_API_TOKEN,
      parseInt(process.env.SERP_MAX_CONCURRENCY) || 6,
      parseInt(process.env.SERP_DELAY_MS) || 300,
      parseInt(process.env.SERP_PAGE_MAX) || 3,
      process.env.SERP_INCLUDE_DOMAINS_FILE || path.join(__dirname, 'data', 'ab-weeklies.json')
    );
    
    const storageService = new AzureStorageService(
      process.env.AZURE_STORAGE_CONNECTION,
      process.env.ARTICLES_CONTAINER || 'articles'
    );
    
    // Ensure container exists
    await storageService.ensureContainerExists();
    
    const startTime = new Date();
    console.log(`[SERPHouse backfill] Starting for ${scope}, ${days} days, limit ${limit}`);
    
    // Process roster
    const results = await serphouseClient.processRoster(roster, scope, only, days, limit);
    
    // Store results in Azure Blob
    let articlesSaved = 0;
    const storageErrors = [];
    
    for (const result of results.results) {
      if (result.success && result.results && result.results.length > 0) {
        const person = roster.find(p => p.slug === result.person);
        if (person) {
          try {
            const storedPaths = await storageService.storePersonResults(person, result);
            articlesSaved += storedPaths.length;
          } catch (error) {
            storageErrors.push({
              slug: person.slug,
              reason: error.message
            });
          }
        }
      }
    }
    
    // Store run summary
    const runSummary = {
      startTs: startTime.toISOString(),
      endTs: new Date().toISOString(),
      window: `${days} days`,
      peopleProcessed: results.peopleProcessed,
      articlesFound: results.articlesFound,
      articlesSaved,
      errors: [...results.errors, ...storageErrors]
    };
    
    await storageService.storeRunSummary(runSummary);
    
    console.log(`[SERPHouse backfill] Complete: ${results.peopleProcessed} people, ${articlesSaved} articles saved`);
    
    res.json({
      ok: true,
      peopleProcessed: results.peopleProcessed,
      articlesFound: results.articlesFound,
      articlesSaved,
      errors: [...results.errors, ...storageErrors]
    });
    
  } catch (error) {
    console.error('[SERPHouse backfill] Error:', error.message);
    res.status(500).json({ 
      ok: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// /api/serp/refresh - 24-48 hours refresh for Alberta MLAs/MPs
app.get('/api/serp/refresh', async (req, res) => {
  try {
    const { scope = 'mlas,mps', hours = 48, limit = 50, only } = req.query;
    
    // Load roster
    const rosterPath = path.join(__dirname, 'data', 'ab-reps.json');
    if (!fs.existsSync(rosterPath)) {
      return res.status(500).json({ error: 'Roster file not found', path: rosterPath });
    }
    
    const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
    
    // Initialize clients with environment variables
    const serphouseClient = new SerphouseClient(
      process.env.SERPHOUSE_API_TOKEN,
      parseInt(process.env.SERP_MAX_CONCURRENCY) || 6,
      parseInt(process.env.SERP_DELAY_MS) || 300,
      parseInt(process.env.SERP_PAGE_MAX) || 3,
      process.env.SERP_INCLUDE_DOMAINS_FILE || path.join(__dirname, 'data', 'ab-weeklies.json')
    );
    
    const storageService = new AzureStorageService(
      process.env.AZURE_STORAGE_CONNECTION,
      process.env.ARTICLES_CONTAINER || 'articles'
    );
    
    // Ensure container exists
    await storageService.ensureContainerExists();
    
    const startTime = new Date();
    console.log(`[SERPHouse refresh] Starting for ${scope}, ${hours} hours, limit ${limit}`);
    
    // Convert hours to days for SERPHouse (they use days)
    const days = Math.ceil(hours / 24);
    
    // Process roster
    const results = await serphouseClient.processRoster(roster, scope, only, days, limit);
    
    // Store results in Azure Blob
    let articlesSaved = 0;
    const storageErrors = [];
    
    for (const result of results.results) {
      if (result.success && result.results && result.results.length > 0) {
        const person = roster.find(p => p.slug === result.person);
        if (person) {
          try {
            const storedPaths = await storageService.storePersonResults(person, result);
            articlesSaved += storedPaths.length;
          } catch (error) {
            storageErrors.push({
              slug: person.slug,
              reason: error.message
            });
          }
        }
      }
    }
    
    // Store run summary
    const runSummary = {
      startTs: startTime.toISOString(),
      endTs: new Date().toISOString(),
      window: `${hours} hours`,
      peopleProcessed: results.peopleProcessed,
      articlesFound: results.articlesFound,
      articlesSaved,
      errors: [...results.errors, ...storageErrors]
    };
    
    await storageService.storeRunSummary(runSummary);
    
    console.log(`[SERPHouse refresh] Complete: ${results.peopleProcessed} people, ${articlesSaved} articles saved`);
    
    res.json({
      ok: true,
      peopleProcessed: results.peopleProcessed,
      articlesFound: results.articlesFound,
      articlesSaved,
      errors: [...results.errors, ...storageErrors]
    });
    
  } catch (error) {
    console.error('[SERPHouse refresh] Error:', error.message);
    res.status(500).json({ 
      ok: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// tiny smoke
app.get('/api/test', (_req,res)=>res.json({ ok:true }));

// last 404
app.use((req,res)=>res.status(404).json({error:'Not found',path:req.path,method:req.method}));

// boot-time route log (shows up in Log stream)
if (process.env.LOG_ROUTES !== '0') {
  const list = (app._router?.stack||[])
    .filter(l=>l.route&&l.route.path)
    .map(l=>`${Object.keys(l.route.methods)[0]?.toUpperCase()} ${l.route.path}`);
  console.log('[ingest routes]', list);
}

// B) Route registration logging
console.log('[INGEST] routes registered, and list them:');
if (app._router && app._router.stack) {
  app._router.stack.forEach((layer) => {
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods);
      methods.forEach(method => {
        console.log(`[INGEST] route: ${method.toUpperCase()} ${layer.route.path}`);
      });
    }
  });
} else {
  console.log('[INGEST] no router found for route listing');
}

module.exports = app;
