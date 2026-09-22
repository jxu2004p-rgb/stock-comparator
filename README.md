# Pairwise

A focused stock and ETF return comparison tool. It defaults to AVGO vs. VOO and supports 1-month through 10-year/max performance windows.

## Run locally

```powershell
npm start
```

Then open <http://127.0.0.1:4173>.

The app uses a small dependency-free Node server to request adjusted historical prices from Yahoo Finance. If live market data is unavailable, the interface falls back to representative preview data and labels it clearly.

## Deploy to Vercel

The repository is ready for Vercel's zero-configuration Git deployment:

1. Import the GitHub repository into Vercel.
2. Keep **Framework Preset** set to `Other`.
3. Leave the build and output-directory fields empty.
4. Deploy—no environment variables are required.

Static assets are served from the repository root. `/api/finance/[symbol]` runs as a Node.js serverless function and caches successful market-data responses at the edge for five minutes.
