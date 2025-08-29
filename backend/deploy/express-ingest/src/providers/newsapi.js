const NewsAPI = require("newsapi");

function getClient() {
  const key = (process.env.NEWSAPI_API_KEY || process.env.NEWS_API_KEY);
  if (!key) throw new Error("Missing NEWSAPI_API_KEY");
  return new NewsAPI(key);
}

async function fetchNewsApiTopHeadlines(params) {
  const client = getClient();
  const res = await client.v2.topHeadlines(params);
  return res;
}

async function fetchNewsApiEverything(params) {
  const client = getClient();
  const res = await client.v2.everything(params);
  return res;
}

module.exports = {
  fetchNewsApiTopHeadlines,
  fetchNewsApiEverything
}; 