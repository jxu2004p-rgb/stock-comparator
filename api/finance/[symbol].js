const { normalizeSymbol, requestMarketData } = require('../../lib/market-data');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const symbol = normalizeSymbol(req.query.symbol);
  if (!symbol) return res.status(400).json({ error: 'Invalid symbol' });

  try {
    const marketData = await requestMarketData(symbol);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', marketData.status === 200
      ? 'public, s-maxage=300, stale-while-revalidate=600'
      : 'no-store');
    return res.status(marketData.status).send(marketData.body);
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Market data is temporarily unavailable' });
  }
};
