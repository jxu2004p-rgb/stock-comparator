# Pairwise

A focused stock and ETF return comparison tool. It defaults to AVGO vs. VOO and supports 1-month through 10-year/max performance windows.

## Run locally

```powershell
npm start
```

Then open <http://127.0.0.1:4173>.

The app uses a small dependency-free Node server to request adjusted historical prices from Yahoo Finance. If live market data is unavailable, the interface falls back to representative preview data and labels it clearly.
