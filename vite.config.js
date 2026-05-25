import { defineConfig } from 'vite';

const espnTarget = 'https://site.api.espn.com';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/nba/scoreboard': {
        target: espnTarget,
        changeOrigin: true,
        rewrite: (path) => {
          const match = path.match(/^\/api\/nba\/scoreboard\/(\d{8})$/);
          return match
            ? `/apis/site/v2/sports/basketball/nba/scoreboard?dates=${match[1]}`
            : '/apis/site/v2/sports/basketball/nba/scoreboard';
        }
      },
      '/api/nba/playbyplay': {
        target: espnTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(
          /^\/api\/nba\/playbyplay\/([^/]+)$/,
          '/apis/site/v2/sports/basketball/nba/summary?event=$1'
        )
      },
      '/api/nba/schedule': {
        target: espnTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nba\/schedule\/(\d{8})$/, '/apis/site/v2/sports/basketball/nba/scoreboard?dates=$1')
      }
    }
  },
  build: {
    sourcemap: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'app-[name].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || 'asset';
          if (name.endsWith('.css')) return 'app.css';
          return '[name][extname]';
        }
      }
    }
  }
});
