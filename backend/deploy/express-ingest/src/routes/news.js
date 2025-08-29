const express = require("express");
const { fetchNewsDataLatest, fetchNewsDataArchive } = require("../providers/newsdata");
const { fetchNewsApiTopHeadlines, fetchNewsApiEverything } = require("../providers/newsapi");

const router = express.Router();

// GET /api/newsdata?q=keyword
router.get("/newsdata", async (req, res) => {
  try {
    const q = req.query.q || "";
    const data = await fetchNewsDataLatest(q);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || "newsdata_failed" });
  }
});

// GET /api/newsdata/archive?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD&q=keyword&language=en
router.get("/newsdata/archive", async (req, res) => {
  try {
    const params = {};
    for (const [k, v] of Object.entries(req.query)) params[k] = String(v);
    const data = await fetchNewsDataArchive(params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || "newsdata_archive_failed" });
  }
});

// GET /api/newsapi/top-headlines?country=us&category=business&q=bitcoin&language=en
router.get("/newsapi/top-headlines", async (req, res) => {
  try {
    const params = {};
    for (const [k, v] of Object.entries(req.query)) params[k] = v;
    const data = await fetchNewsApiTopHeadlines(params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || "newsapi_top_failed" });
  }
});

// GET /api/newsapi/everything?q=bitcoin&language=en&page=1
router.get("/newsapi/everything", async (req, res) => {
  try {
    const params = {};
    for (const [k, v] of Object.entries(req.query)) params[k] = v;
    const data = await fetchNewsApiEverything(params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || "newsapi_everything_failed" });
  }
});

module.exports = router; 