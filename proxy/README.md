# NBA proxy

Use this when the browser/WebView cannot fetch `cdn.nba.com` directly because of network or CORS restrictions.

## Run locally

```bash
node proxy/server.mjs
```

This exposes:

- `http://localhost:8787/nba/scoreboard`
- `http://localhost:8787/nba/schedule/{YYYYMMDD}`
- `http://localhost:8787/nba/playbyplay/{gameId}`

## Point the app at the proxy

Create a `.env.local` file in the app root:

```bash
VITE_NBA_API_BASE=http://localhost:8787/nba
```

For a deployed version, host this proxy on any Node-capable service and set:

```bash
VITE_NBA_API_BASE=https://your-proxy.example.com/nba
```
