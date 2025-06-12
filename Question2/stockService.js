const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 9877;

// Replace with the actual stock exchange API base URL
const STOCK_API_BASE = 'http://20.244.56.144/evaluation-service';

// In-memory cache for price history (ticker -> [ { price, lastUpdatedAt } ])
const priceCache = new Map();

function filterAndAverage(history, minutes) {
  const now = new Date();
  const filtered = history.filter(item => {
    const t = new Date(item.lastUpdatedAt);
    return (now - t) / 60000 <= minutes;
  });
  const avg = filtered.length > 0 ? filtered.reduce((a, b) => a + b.price, 0) / filtered.length : null;
  return { filtered, avg };
}

function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n !== y.length || n < 2) return null;
  const avgX = x.reduce((a, b) => a + b, 0) / n;
  const avgY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, denomX = 0, denomY = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - avgX) * (y[i] - avgY);
    denomX += (x[i] - avgX) ** 2;
    denomY += (y[i] - avgY) ** 2;
  }
  return denomX && denomY ? num / Math.sqrt(denomX * denomY) : null;
}

// GET /stocks/:ticker?minutes=m&aggregation=average
app.get('/stocks/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const minutes = parseInt(req.query.minutes, 10);
  const aggregation = req.query.aggregation;
  try {
    // Fetch price history from test server
    const url = `${STOCK_API_BASE}/stocks/${ticker}/history`;
    const response = await axios.get(url);
    const history = response.data.priceHistory || [];
    priceCache.set(ticker, history);
    const { filtered, avg } = filterAndAverage(history, minutes);
    res.json({
      averageStockPrice: aggregation === 'average' ? avg : null,
      priceHistory: filtered
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /stockcorrelation?minutes=m&ticker=AAA&ticker=BBB
app.get('/stockcorrelation', async (req, res) => {
  const { minutes, ticker } = req.query;
  if (!minutes || !ticker || (Array.isArray(ticker) && ticker.length !== 2)) {
    return res.status(400).json({ error: "Exactly two tickers and 'minutes' are required." });
  }
  const [ticker1, ticker2] = Array.isArray(ticker) ? ticker : [ticker, ticker];
  try {
    // Fetch price histories
    const url1 = `${STOCK_API_BASE}/stocks/${ticker1}/history`;
    const url2 = `${STOCK_API_BASE}/stocks/${ticker2}/history`;
    const [resp1, resp2] = await Promise.all([
      axios.get(url1),
      axios.get(url2)
    ]);
    const hist1 = resp1.data.priceHistory || [];
    const hist2 = resp2.data.priceHistory || [];
    priceCache.set(ticker1, hist1);
    priceCache.set(ticker2, hist2);
    // Filter histories
    const { filtered: f1, avg: avg1 } = filterAndAverage(hist1, minutes);
    const { filtered: f2, avg: avg2 } = filterAndAverage(hist2, minutes);
    // Align by timestamp (simple approach: use closest timestamps)
    const map2 = new Map(f2.map(i => [i.lastUpdatedAt, i.price]));
    const aligned1 = [], aligned2 = [];
    f1.forEach(item => {
      if (map2.has(item.lastUpdatedAt)) {
        aligned1.push(item.price);
        aligned2.push(map2.get(item.lastUpdatedAt));
      }
    });
    const correlation = pearsonCorrelation(aligned1, aligned2);
    res.json({
      correlation,
      stocks: {
        [ticker1]: { averagePrice: avg1, priceHistory: f1 },
        [ticker2]: { averagePrice: avg2, priceHistory: f2 }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Stock Price Aggregation Microservice running on port ${PORT}`);
});
