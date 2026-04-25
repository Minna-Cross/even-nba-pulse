// Cloudflare Worker (ES Modules) for NBA CORS proxy
// Routes: /nba/scoreboard, /nba/scoreboard/:date, /nba/playbyplay/:gameId, /nba/schedule/:date

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const ALLOW_ORIGIN = '*';
    const FETCH_TIMEOUT_MS = 8000;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': ALLOW_ORIGIN,
          'access-control-allow-methods': 'GET,OPTIONS',
          'access-control-allow-headers': 'content-type'
        }
      });
    }

    let targetUrl;

    if (path === '/nba/scoreboard') {
      targetUrl = 'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json';
    } else if (path.match(/^\/nba\/scoreboard\/\d{8}$/)) {
      const gameDate = path.split('/').pop();
      targetUrl = `https://cdn.nba.com/static/json/liveData/scoreboard/scoreboard_${gameDate}.json`;
    } else if (path.match(/^\/nba\/playbyplay\/[^/]+$/)) {
      const gameId = path.split('/').pop();
      targetUrl = `https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`;
    } else if (path.match(/^\/nba\/schedule\/\d{8}$/)) {
      const dateKey = path.split('/').pop();
      targetUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateKey}`;
    } else {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(targetUrl, {
        headers: { 'user-agent': 'even-nba-pulse-proxy/1.0' },
        signal: controller.signal
      });

      const body = await response.text();
      const headers = new Headers(response.headers);
      headers.set('access-control-allow-origin', ALLOW_ORIGIN);
      headers.set('access-control-allow-methods', 'GET,OPTIONS');
      headers.set('access-control-allow-headers', 'content-type');

      console.log(JSON.stringify({
        at: new Date().toISOString(),
        sourcePath: path,
        targetUrl,
        status: response.status
      }));

      return new Response(body, {
        status: response.status,
        headers
      });
    } catch (error) {
      const status = error?.name === 'AbortError' ? 504 : 502;
      console.log(JSON.stringify({
        at: new Date().toISOString(),
        sourcePath: path,
        targetUrl,
        status,
        error: error instanceof Error ? error.message : String(error)
      }));

      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
        status,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': ALLOW_ORIGIN }
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
};
