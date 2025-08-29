const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'CanadaWill API3',
    routes: ['/api/v1/news/status', '/api/v1/news/ingest']
  });
});

const newsRoutes = require('./src/routes/newsRoutes');
app.use('/api/v1/news', newsRoutes);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`API3 listening on ${port}`);
}); 