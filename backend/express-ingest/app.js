const app = require("./ingest-minimal.js");
const port = process.env.PORT || process.env.WEBSITES_PORT || 8080;
if (require.main === module) {
  app.listen(port, () => console.log(`[ingest shim] listening on ${port}`));
}
module.exports = app;
