import express from 'express';
import { fetchNewsData } from '../providers/newsdata';

const router = express.Router();

interface NewsDataRequest {
  name: string;
  days?: number;
}

interface NewsDataResponse {
  ok: boolean;
  count?: number;
  articles?: any[];
  error?: string;
}

router.post('/newsdata', async (req, res) => {
  try {
    const { name, days = 2 }: NewsDataRequest = req.body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'name is required and must be a non-empty string'
      } as NewsDataResponse);
    }

    if (days !== undefined && (typeof days !== 'number' || days < 1 || days > 48)) {
      return res.status(400).json({
        ok: false,
        error: 'days must be a number between 1 and 48'
      } as NewsDataResponse);
    }

    // Fetch news data
    const articles = await fetchNewsData(name.trim(), days);
    
    const response: NewsDataResponse = {
      ok: true,
      count: articles.length,
      articles
    };

    res.json(response);
  } catch (error) {
    console.error('NewsData route error:', error);
    
    const response: NewsDataResponse = {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };

    res.status(500).json(response);
  }
});

export default router; 