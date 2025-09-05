const app = require("./ingest-minimal.js");

// Admin backfill endpoint (runs ON Azure; registers /api/admin/backfill)
try {
  require('./src/admin-backfill.runtime')(app);   // your file lives in /src
  console.log('admin-backfill route loaded');
} catch (e) {
  console.error('admin-backfill not loaded:', e && e.message ? e.message : e);
}

const port = process.env.PORT || process.env.WEBSITES_PORT || 8080;
if (require.main === module) {
  app.listen(port, () => console.log(`[ingest shim] listening on ${port}`));
}
module.exports = app;
