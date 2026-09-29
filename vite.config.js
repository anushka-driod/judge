import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
<<<<<<< HEAD
    host: true,
    port: 5173,
    cors: true,
=======
    port: 5173,
>>>>>>> origin/main
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
<<<<<<< HEAD
        secure: false,
        ws: true,
        timeout: 300000,
        proxyTimeout: 300000,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.warn('[Vite Proxy Error]:', err.message);
            if (res && !res.headersSent) {
              try {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Backend service reconnecting...', code: 'PROXY_RECONNECTING' }));
              } catch (_) {}
            }
          });
        },
=======
>>>>>>> origin/main
      },
    },
  },
})
