const axios = require("axios");

const BASE = "https://newsdata.io/api/1";

async function fetchNewsDataLatest(q) {
  const apikey = (process.env.NEWSDATA_API_KEY || process.env.NEWSDATAIO_API_KEY || process.env.NEWSDATA_KEY);
  if (!apikey) throw new Error("Missing NEWSDATA_API_KEY");
  const url = `${BASE}/latest`;
  const res = await axios.get(url, { params: { apikey, q } });
  return res.data;
}

async function fetchNewsDataArchive(params) {
  const apikey = (process.env.NEWSDATA_API_KEY || process.env.NEWSDATAIO_API_KEY || process.env.NEWSDATA_KEY);
  if (!apikey) throw new Error("Missing NEWSDATA_API_KEY");
  const url = `${BASE}/archive`;
  const res = await axios.get(url, { params: { apikey, ...params } });
  return res.data;
}

module.exports = {
  fetchNewsDataLatest,
  fetchNewsDataArchive
}; 