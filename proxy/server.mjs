import http from 'node:http';

const PORT = process.env.PORT || 8787;
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 8000);

function writeJson(res, status, data) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': ALLOW_ORIGIN,
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  res.end(JSON.stringify(data));
}

function logProxy(entry) {
  console.log(JSON.stringify({ at: new Date().toISOString(), ...entry }));
}

async function proxyFetch(sourcePath, targetUrl, res) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(targetUrl, {
      headers: { 'user-agent': 'even-nba-pulse-proxy/1.0' },
      signal: controller.signal
    });
    const text = await response.text();
    res.writeHead(response.status, {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': ALLOW_ORIGIN,
      'access-control-allow-methods': 'GET,OPTIONS',
      'access-control-allow-headers': 'content-type'
    });
    res.end(text);
    logProxy({
      sourcePath,
      targetUrl,
      status: response.status,
      durationMs: Date.now() - startedAt
    });
  } catch (error) {
    const status = error?.name === 'AbortError' ? 504 : 502;
    logProxy({
      sourcePath,
      targetUrl,
      status,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error)
    });
    writeJson(res, status, { error: error instanceof Error ? error.message : String(error) });
  } finally {
    clearTimeout(timeoutId);
  }
}

const server = http.createServer((req, res) => {
  if (!req.url) return writeJson(res, 400, { error: 'Missing url' });
  if (req.method === 'OPTIONS') return writeJson(res, 204, {});

  if (req.url === '/nba/scoreboard') {
    return proxyFetch(
      req.url,
      'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json',
      res
    );
  }

  const scoreboardByDateMatch = req.url.match(/^\/nba\/scoreboard\/(\d{8})$/);
  if (scoreboardByDateMatch) {
    const gameDate = scoreboardByDateMatch[1];
    return proxyFetch(
      req.url,
      `https://cdn.nba.com/static/json/liveData/scoreboard/scoreboard_${gameDate}.json`,
      res
    );
  }

  const playMatch = req.url.match(/^\/nba\/playbyplay\/([^/]+)$/);
  if (playMatch) {
    const gameId = playMatch[1];
    return proxyFetch(
      req.url,
      `https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`,
      res
    );
  }

  const scheduleMatch = req.url.match(/^\/nba\/schedule\/(\d{8})$/);
  if (scheduleMatch) {
    const dateKey = scheduleMatch[1];
    return proxyFetch(
      req.url,
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateKey}`,
      res
    );
  }

  return writeJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`NBA proxy listening on http://localhost:${PORT}`);
});
