import express from 'express';
import cors from 'cors';
import newsRoutes from './routes/newsRoutes';
import newsdataRoutes from './routes/newsdata';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'CanadaWill API3',
    routes: ['/api/v1/news/status', '/api/v1/news/ingest', '/api/newsdata']
  });
});

// Mount existing news routes
app.use('/api/v1/news', newsRoutes);

// Mount new NewsData routes
app.use('/api', newsdataRoutes);

export default app; 