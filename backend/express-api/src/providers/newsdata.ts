import axios from 'axios';

interface NewsDataResponse {
  status: string;
  results: any[];
  totalResults?: number;
}

interface NewsDataParams {
  q: string;
  language: string;
  size: number;
  timeframe?: number;
}

export async function fetchNewsData(name: string, days: number = 7): Promise<any[]> {
  const apiKey = process.env.NEWSDATAIO_API_KEY;
  if (!apiKey) {
    throw new Error('NEWSDATAIO_API_KEY environment variable not set');
  }

  const params: NewsDataParams = {
    q: name,
    language: 'en',
    size: 10
  };

  // Convert days to hours (max 48 for latest endpoint)
  const hours = Math.min(days * 24, 48);
  if (hours > 0) {
    params.timeframe = hours;
  }

  try {
    const response = await axios.get<NewsDataResponse>('https://newsdata.io/api/1/latest', {
      params: {
        ...params,
        apikey: apiKey
      }
    });

    if (response.data.status !== 'success') {
      throw new Error(`NewsData API error: ${response.data.status}`);
    }

    return response.data.results || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`NewsData API request failed: ${error.message}`);
    }
    throw error;
  }
} 