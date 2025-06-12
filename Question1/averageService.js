const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 9876;
const WINDOW_SIZE = 10;
let window = [];

const apiMap = {
  p: 'http://20.244.56.144/evaluation-service/primes',
  f: 'http://20.244.56.144/evaluation-service/fibo',
  e: 'http://20.244.56.144/evaluation-service/even',
  r: 'http://20.244.56.144/evaluation-service/rand'
};

app.use(express.json());

// Test all four number APIs
app.get('/test-all', async (req, res) => {
  const results = {};
  const apiNames = { p: 'primes', f: 'fibo', e: 'even', r: 'rand' };
  try {
    await Promise.all(Object.entries(apiMap).map(async ([key, url]) => {
      try {
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`
          }
        });
        results[apiNames[key]] = response.data.numbers || [];
        console.log(`${apiNames[key]}:`, results[apiNames[key]]);
      } catch (err) {
        results[apiNames[key]] = { error: err.message };
        console.error(`Error fetching ${apiNames[key]}:`, err.message);
      }
    }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch one or more APIs', details: err.message });
  }
});

const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQ5NzEwMzE3LCJpYXQiOjE3NDk3MTAwMTcsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6IjUyY2E0NWQ3LWJmZmQtNDNkZS1iN2QzLWFkYTliNmE1OWQ1ZiIsInN1YiI6ImFydW5rdW1hcnBhaWRpcGVsbGk0NkBnbWFpbC5jb20ifSwiZW1haWwiOiJhcnVua3VtYXJwYWlkaXBlbGxpNDZAZ21haWwuY29tIiwibmFtZSI6InBhaWRpcGVsbGkgYXJ1biBrdW1hciIsInJvbGxObyI6IjIzMDNhNTFsNDgiLCJhY2Nlc3NDb2RlIjoiTVZHd0VGIiwiY2xpZW50SUQiOiI1MmNhNDVkNy1iZmZkLTQzZGUtYjdkMy1hZGE5YjZhNTlkNWYiLCJjbGllbnRTZWNyZXQiOiJWektxQ0t3WmFQRnFwckVTIn0.6eY4dSIZDtGaJQSbqkzHfdfdAPdCo2fvK6mRe8OFpb4';

app.post('/numbers/:numberid', async (req, res) => {
  const { numberid } = req.params;
  const apiUrl = apiMap[numberid];

  if (!apiUrl) {
    return res.status(400).json({ error: 'Invalid numberid' });
  }

  const windowPrevState = [...window];
  let numbers = [];

  console.log('Fetching from:', apiUrl);

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`
      }
    });
    numbers = response.data.numbers || [];
  } catch (err) {
    console.error('Error fetching numbers:', err.message);
    numbers = [];
  }

  for (const num of numbers) {
    if (!window.includes(num)) {
      window.push(num);
      if (window.length > WINDOW_SIZE) {
        window.shift();
      }
    }
  }

  const windowCurrState = [...window];
  const avg =
    window.length > 0
      ? Number((window.reduce((a, b) => a + b, 0) / window.length).toFixed(2))
      : 0;

  res.json({
    windowPrevState,
    windowCurrState,
    numbers,
    avg
  });
});

app.listen(PORT, () => {
  console.log(`Average Calculator Microservice running on port ${PORT}`);
});