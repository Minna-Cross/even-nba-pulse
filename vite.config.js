import { defineConfig } from 'vite';

const scoreboardTarget = 'https://cdn.nba.com';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/nba/scoreboard/': {
        target: scoreboardTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(
          /^\/api\/nba\/scoreboard\/(\d{8})$/,
          '/static/json/liveData/scoreboard/scoreboard_$1.json'
        )
      },
      '/api/nba/scoreboard': {
        target: scoreboardTarget,
        changeOrigin: true,
        rewrite: () => '/static/json/liveData/scoreboard/todaysScoreboard_00.json'
      },
      '/api/nba/playbyplay': {
        target: scoreboardTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nba\/playbyplay\/([^/]+)$/, '/static/json/liveData/playbyplay/playbyplay_$1.json')
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
