const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// Mount news router
const newsRoutes = require('./dist/routes/newsRoutes').default;
app.use('/', newsRoutes);

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

module.exports = app;
