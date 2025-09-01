const app = require("./backend/express-ingest/ingest-minimal.js");
const port = process.env.PORT || process.env.WEBSITES_PORT || 8080;
if (require.main === module) {
  app.listen(port, () => console.log(`[root app] listening on ${port}`));
}
module.exports = app;
