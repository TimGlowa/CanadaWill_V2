// force-load the fresh ingest app (avoid any old app.js confusion)
const app = require('./ingest-minimal.js');
const port = process.env.PORT || process.env.WEBSITES_PORT || 8080;
app.listen(port, () => console.log(`[ingest] listening on ${port}`));
