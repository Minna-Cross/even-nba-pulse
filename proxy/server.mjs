import http from 'node:http';

const PORT = process.env.PORT || 8787;
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';

function writeJson(res, status, data) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': ALLOW_ORIGIN,
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  res.end(JSON.stringify(data));
}

async function proxyFetch(url, res) {
  try {
    const response = await fetch(url, { headers: { 'user-agent': 'even-nba-pulse-proxy/1.0' } });
    const text = await response.text();
    res.writeHead(response.status, {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': ALLOW_ORIGIN,
      'access-control-allow-methods': 'GET,OPTIONS',
      'access-control-allow-headers': 'content-type'
    });
    res.end(text);
  } catch (error) {
    writeJson(res, 502, { error: error instanceof Error ? error.message : String(error) });
  }
}

const server = http.createServer((req, res) => {
  if (!req.url) return writeJson(res, 400, { error: 'Missing url' });
  if (req.method === 'OPTIONS') return writeJson(res, 204, {});

  if (req.url === '/nba/scoreboard') {
    return proxyFetch('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json', res);
  }

  const scoreboardByDateMatch = req.url.match(/^\/nba\/scoreboard\/(\d{8})$/);
  if (scoreboardByDateMatch) {
    const gameDate = scoreboardByDateMatch[1];
    return proxyFetch(`https://cdn.nba.com/static/json/liveData/scoreboard/scoreboard_${gameDate}.json`, res);
  }

  const playMatch = req.url.match(/^\/nba\/playbyplay\/([^/]+)$/);
  if (playMatch) {
    const gameId = playMatch[1];
    return proxyFetch(`https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`, res);
  }

  return writeJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`NBA proxy listening on http://localhost:${PORT}`);
});
