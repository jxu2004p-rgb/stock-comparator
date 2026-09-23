const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const PERIOD_DAYS = { '1mo': 31, '3mo': 93, '6mo': 186, '1y': 366, '3y': 1096, '5y': 1827, max: Infinity };
const FALLBACK_NAMES = { AVGO: 'Broadcom Inc.', VOO: 'Vanguard S&P 500 ETF', NVDA: 'NVIDIA Corporation', AAPL: 'Apple Inc.', SPY: 'SPDR S&P 500 ETF', MSFT: 'Microsoft Corporation', GOOGL: 'Alphabet Inc.', INTC: 'Intel Corporation', AMD: 'Advanced Micro Devices, Inc.' };
const state = { period: '1y', a: null, b: null, language: 'en' };
const TRANSLATIONS = {
  en: {
    pageTitle: 'Pairwise — Stock Return Comparison', symbolA: 'First stock symbol', symbolB: 'Second stock symbol', chartLabel: 'Historical investment value chart', navCompare: 'Compare', navMethodology: 'Methodology', marketData: 'MARKET DATA', relativePerformance: 'RELATIVE PERFORMANCE / 01', heroLine1: 'Which investment', heroLine2: 'went further?', heroCopy: 'Put two stocks or ETFs head-to-head. See how $10,000 would have grown across key time horizons.', assetA: 'ASSET A', assetB: 'ASSET B', runComparison: 'Run comparison', quickPairs: 'QUICK PAIRS', scorecard: 'THE SCORECARD / 02', against: 'against', pricesThrough: 'PRICES THROUGH', totalReturn: 'TOTAL RETURN', outperformer: 'OUTPERFORMER', aheadBy: 'ahead by', percentagePoints: 'percentage points', growthTitle: 'Growth of $10,000', growthSubtitle: 'Normalized performance using adjusted close', fetching: 'Fetching price history…', finePrint: 'THE FINE PRINT / 03', methodLine1: 'Simple math.', methodLine2: 'Useful perspective.', methodCopy1: 'Returns compare the first and last available adjusted closing prices in each period. The growth chart normalizes both assets to a starting value of $10,000.', methodCopy2: 'Past performance is not a guarantee of future results. This tool is for education—not financial advice. Always do your own research.', dataProvided: 'DATA PROVIDED BY YAHOO FINANCE', fallbackNote: 'Live quotes are unavailable in this browser, so representative sample data is shown for interface preview.', liveNote: 'Returns use adjusted close where available. Market data may be delayed.', loading: 'Loading…', switchLabel: 'Switch to Chinese'
  },
  zh: {
    pageTitle: 'Pairwise — 股票回报比较', symbolA: '第一只股票代码', symbolB: '第二只股票代码', chartLabel: '历史投资价值走势图', navCompare: '比较', navMethodology: '计算方式', marketData: '市场数据', relativePerformance: '相对表现 / 01', heroLine1: '哪项投资', heroLine2: '走得更远？', heroCopy: '将两只股票或 ETF 进行对比，看看一万美元在不同时间跨度内会增长到多少。', assetA: '资产 A', assetB: '资产 B', runComparison: '开始比较', quickPairs: '热门组合', scorecard: '表现对比 / 02', against: '对比', pricesThrough: '价格截至', totalReturn: '总回报', outperformer: '表现更佳', aheadBy: '领先', percentagePoints: '个百分点', growthTitle: '一万美元的增长', growthSubtitle: '使用复权收盘价标准化计算', fetching: '正在获取历史价格…', finePrint: '说明 / 03', methodLine1: '简单计算，', methodLine2: '实用视角。', methodCopy1: '回报率比较每个时期内首个和最后一个可用的复权收盘价。增长图将两项资产的起始价值统一设为一万美元。', methodCopy2: '过去的表现不代表未来的结果。本工具仅用于教育目的，不构成投资建议。请务必自行研究。', dataProvided: '数据由 YAHOO FINANCE 提供', fallbackNote: '此浏览器暂时无法获取实时行情，当前显示具有代表性的示例数据用于界面预览。', liveNote: '回报率在可用时采用复权收盘价。市场数据可能存在延迟。', loading: '加载中…', switchLabel: '切换到英文'
  }
};

function applyLanguage() {
  const copy = TRANSLATIONS[state.language];
  document.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en';
  document.title = copy.pageTitle;
  $$('[data-i18n]').forEach(element => { element.textContent = copy[element.dataset.i18n]; });
  const switcher = $('#language-switch');
  switcher.classList.toggle('is-zh', state.language === 'zh');
  switcher.setAttribute('aria-label', copy.switchLabel);
  $('#symbol-a').setAttribute('aria-label', copy.symbolA);
  $('#symbol-b').setAttribute('aria-label', copy.symbolB);
  $('#performance-chart').setAttribute('aria-label', copy.chartLabel);
  if (state.a && state.b) updateUI();
}

function seededHistory(symbol) {
  let seed = [...symbol].reduce((n, c) => n + c.charCodeAt(0), 17);
  const points = [];
  const end = new Date();
  const profile = { AVGO: [4.7, .032], VOO: [1.7, .013], NVDA: [6.5, .05], AAPL: [2.6, .022], SPY: [1.65, .013], MSFT: [2.4, .019], GOOGL: [2.2, .021], INTC: [.82, .027], AMD: [3.1, .034] }[symbol] || [1.45, .024];
  let price = 100;
  for (let i = 0; i < 1305; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const noise = (seed / 233280 - .475) * profile[1];
    price *= 1 + (Math.log(profile[0]) / 1305) + noise;
    const date = new Date(end); date.setDate(date.getDate() - (1304 - i) * 7 / 5);
    points.push({ date, value: Math.max(price, 5) });
  }
  return { symbol, name: FALLBACK_NAMES[symbol] || `${symbol} security`, points, fallback: true };
}

async function fetchHistory(symbol) {
  const url = `/api/finance/${encodeURIComponent(symbol)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No market data for ${symbol}`);
  const result = (await response.json()).chart?.result?.[0];
  if (!result?.timestamp?.length) throw new Error(`Symbol ${symbol} was not found`);
  const closes = result.indicators?.adjclose?.[0]?.adjclose || result.indicators?.quote?.[0]?.close;
  const points = result.timestamp.map((t, i) => ({ date: new Date(t * 1000), value: closes[i] })).filter(p => Number.isFinite(p.value));
  return { symbol, name: result.meta.longName || result.meta.shortName || FALLBACK_NAMES[symbol] || symbol, points, fallback: false };
}

async function loadSymbol(symbol) {
  try { return await fetchHistory(symbol); }
  catch (error) { return { ...seededHistory(symbol), error: error.message }; }
}

function filtered(data) {
  const days = PERIOD_DAYS[state.period];
  if (!Number.isFinite(days)) return data.points;
  const end = data.points.at(-1).date;
  const start = new Date(end); start.setDate(start.getDate() - days);
  return data.points.filter(p => p.date >= start);
}

function metrics(data) {
  const points = filtered(data);
  const first = points[0]?.value, last = points.at(-1)?.value;
  return { points, change: (last / first - 1) * 100, investment: 10000 * last / first };
}

function money(value) { return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }
function percent(value) { return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`; }
function dateLabel(date, options) { return date.toLocaleDateString(state.language === 'zh' ? 'zh-CN' : 'en-US', options); }

function linePath(values, x, y) {
  return values.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(2)},${y(p.norm).toFixed(2)}`).join(' ');
}

function interpolate(points, date) {
  let nearest = points[0];
  for (const p of points) { if (Math.abs(p.date - date) < Math.abs(nearest.date - date)) nearest = p; }
  return nearest;
}

function renderChart(ma, mb) {
  const svg = $('#performance-chart');
  const allDates = [...ma.points, ...mb.points].map(p => +p.date);
  const minDate = Math.min(...allDates), maxDate = Math.max(...allDates);
  const norm = (m) => m.points.map(p => ({ ...p, norm: 10000 * p.value / m.points[0].value }));
  const pa = norm(ma), pb = norm(mb);
  const maxVal = Math.max(...pa.map(p => p.norm), ...pb.map(p => p.norm)) * 1.08;
  const minVal = Math.min(...pa.map(p => p.norm), ...pb.map(p => p.norm), 10000) * .9;
  const pad = { l: 65, r: 24, t: 25, b: 42 }, w = 1000, h = 390;
  const x = d => pad.l + (+d - minDate) / (maxDate - minDate || 1) * (w - pad.l - pad.r);
  const y = v => h - pad.b - (v - minVal) / (maxVal - minVal || 1) * (h - pad.t - pad.b);
  const ticks = 5;
  const grid = Array.from({ length: ticks }, (_, i) => {
    const val = minVal + (maxVal - minVal) * i / (ticks - 1), yy = y(val);
    return `<line x1="${pad.l}" x2="${w-pad.r}" y1="${yy}" y2="${yy}" stroke="rgba(23,23,19,.11)" stroke-dasharray="3 5"/><text x="${pad.l-10}" y="${yy+4}" text-anchor="end" font-family="DM Mono" font-size="9" fill="#746f65">$${Math.round(val/1000)}k</text>`;
  }).join('');
  const dateTicks = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(minDate + (maxDate-minDate)*i/4);
    return `<text x="${x(d)}" y="${h-12}" text-anchor="middle" font-family="DM Mono" font-size="9" fill="#746f65">${dateLabel(d,{month:'short',year:'2-digit'})}</text>`;
  }).join('');
  svg.innerHTML = `${grid}${dateTicks}<path d="${linePath(pa,x,y)}" fill="none" stroke="#85aa11" stroke-width="4" vector-effect="non-scaling-stroke"/><path d="${linePath(pb,x,y)}" fill="none" stroke="#7b6cf6" stroke-width="4" vector-effect="non-scaling-stroke"/><line id="hover-line" x1="0" x2="0" y1="${pad.t}" y2="${h-pad.b}" stroke="#171713" stroke-width="1" stroke-dasharray="4 4" visibility="hidden"/>`;

  svg.onmousemove = (event) => {
    const rect = svg.getBoundingClientRect();
    const svgX = (event.clientX - rect.left) / rect.width * w;
    const ratio = Math.max(0, Math.min(1, (svgX-pad.l)/(w-pad.l-pad.r)));
    const date = new Date(minDate + ratio*(maxDate-minDate));
    const a = interpolate(pa,date), b = interpolate(pb,date);
    const line = $('#hover-line'); line.setAttribute('x1', x(date)); line.setAttribute('x2', x(date)); line.setAttribute('visibility','visible');
    const tip = $('#chart-tooltip'); tip.hidden = false; tip.style.left = `${event.clientX-rect.left}px`; tip.style.top = `${Math.min(y(Math.max(a.norm,b.norm))/h*rect.height+10, rect.height-50)}px`;
    tip.innerHTML = `${dateLabel(date,{month:'short',day:'numeric',year:'numeric'})}<br><span style="color:#c8ef42">${state.a.symbol}: ${money(a.norm)}</span><br><span style="color:#a99fff">${state.b.symbol}: ${money(b.norm)}</span>`;
  };
  svg.onmouseleave = () => { $('#hover-line')?.setAttribute('visibility','hidden'); $('#chart-tooltip').hidden = true; };
}

function updateUI() {
  const ma = metrics(state.a), mb = metrics(state.b);
  const aWins = ma.change >= mb.change, winner = aWins ? state.a : state.b;
  const values = {
    '#heading-a': state.a.symbol, '#heading-b': state.b.symbol, '#card-symbol-a': state.a.symbol, '#card-symbol-b': state.b.symbol,
    '#card-name-a': state.a.name, '#card-name-b': state.b.name, '#name-a': state.a.name, '#name-b': state.b.name,
    '#legend-a': state.a.symbol, '#legend-b': state.b.symbol, '#return-a': percent(ma.change), '#return-b': percent(mb.change),
    '#value-a': money(ma.investment), '#value-b': money(mb.investment), '#winner-symbol': winner.symbol,
    '#winner-margin': Math.abs(ma.change-mb.change).toFixed(1), '#as-of-date': dateLabel(state.a.points.at(-1).date,{month:'short',day:'numeric',year:'numeric'}).toUpperCase()
  };
  Object.entries(values).forEach(([selector, value]) => $(selector).textContent = value);
  const fallback = state.a.fallback || state.b.fallback;
  $('#data-note').textContent = fallback ? TRANSLATIONS[state.language].fallbackNote : TRANSLATIONS[state.language].liveNote;
  renderChart(ma, mb);
}

async function compare(a, b) {
  const button = $('.symbol-form > button span:first-child');
  $('#loading').classList.remove('hidden'); button.textContent = TRANSLATIONS[state.language].loading;
  const [dataA, dataB] = await Promise.all([loadSymbol(a), loadSymbol(b)]);
  state.a = dataA; state.b = dataB;
  $('#symbol-a').value = dataA.symbol; $('#symbol-b').value = dataB.symbol;
  updateUI();
  $('#loading').classList.add('hidden'); button.textContent = TRANSLATIONS[state.language].runComparison;
}

$('#comparison-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const a = $('#symbol-a').value.trim().toUpperCase(), b = $('#symbol-b').value.trim().toUpperCase();
  if (a && b) compare(a,b);
});
$$('.quick-pairs button').forEach(button => button.addEventListener('click', () => compare(button.dataset.a, button.dataset.b)));
$$('.period-tabs button').forEach(button => button.addEventListener('click', () => {
  $$('.period-tabs button').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-selected', b === button); });
  state.period = button.dataset.period; if (state.a && state.b) updateUI();
}));
['#symbol-a','#symbol-b'].forEach(selector => $(selector).addEventListener('input', event => { event.target.value = event.target.value.toUpperCase().replace(/[^A-Z.\-]/g,''); }));
$('#language-switch').addEventListener('click', () => { state.language = state.language === 'en' ? 'zh' : 'en'; applyLanguage(); });

applyLanguage();
compare('AVGO','VOO');
