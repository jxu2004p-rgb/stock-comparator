const SYMBOL_PATTERN = /^[A-Z0-9.\-^]{1,12}$/;

function normalizeSymbol(value) {
  const symbol = String(Array.isArray(value) ? value[0] : value || '').trim().toUpperCase();
  return SYMBOL_PATTERN.test(symbol) ? symbol : null;
}

async function requestMarketData(symbol) {
  const endpoint = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=10y&interval=1d&events=history&includeAdjustedClose=true`;
  const upstream = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 Pairwise/1.0'
    }
  });

  return {
    status: upstream.status,
    body: await upstream.text()
  };
}

module.exports = { normalizeSymbol, requestMarketData };
