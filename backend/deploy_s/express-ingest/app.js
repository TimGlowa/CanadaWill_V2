// shim for any code still requiring './express-ingest/app'
module.exports = require('./ingest');

if (require.main === module) {
  const port = process.env.PORT || process.env.WEBSITES_PORT || 8080;
  const app = require('./ingest');
  app.listen(port, () => console.log(`[ingest] app.js direct entry listening on ${port}`));
}
