import dotenv from 'dotenv';
import app from './app.js';
import db from './config/db.js';

if (!(process.env.NODE_ENV === 'test' && process.env.VIDHISETU_TEST_MODE === 'isolated')) {
  dotenv.config();
}

const PORT = parseInt(process.env.PORT || '5000', 10);

// Global Crash-Proof Process Guards (Never let unhandled errors terminate the server)
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL PROCESS GUARD] Caught Unhandled Exception:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL PROCESS GUARD] Caught Unhandled Rejection:', reason);
});

async function startServer() {
  console.log('====================================================');
  console.log('EarnLaw Central Integration Server (Member 2)');
  console.log('High-Resilience Server Engine Active');
  console.log('====================================================');

  // Verify the selected persistence mode before serving requests.
  try {
    const connected = await db.testConnection();
    if (!connected && db.getPersistenceMode() === 'memory') {
      console.warn('[Persistence] PostgreSQL unavailable; using configured memory/disk fallback.');
    } else if (!connected) {
      console.error('[Persistence] PostgreSQL unavailable and memory fallback is disabled.');
    }
  } catch (dbErr) {
    console.error('[Persistence] PostgreSQL connection check failed:', dbErr.message);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Member 2 Server] Listening on http://0.0.0.0:${PORT} (http://localhost:${PORT})`);
    console.log(`- Healthcheck: http://localhost:${PORT}/health`);
    console.log(`- System Status: http://localhost:${PORT}/api/system/status`);
  });

  // Server Socket & Timeout Hardening
  server.keepAliveTimeout = 120000; // 2 minutes keep-alive
  server.headersTimeout = 125000;   // 125 seconds header timeout
  server.requestTimeout = 300000;   // 5 minutes request timeout
  server.maxHeadersCount = 2000;

  server.on('clientError', (err, socket) => {
    console.warn('[HTTP Server] Client Error:', err.message);
    if (!socket.destroyed) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    }
  });

  // Graceful termination handling
  const shutdown = (signal) => {
    console.log(`[Server] Received ${signal}. Closing HTTP connections gracefully...`);
    server.close(() => {
      console.log('[Server] Closed all pending connections cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
