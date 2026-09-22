import dotenv from 'dotenv';
import app from './app.js';
import db from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  console.log('====================================================');
  console.log('EarnLaw Central Integration Server (Member 2)');
  console.log('====================================================');

  // Test AnuDB PostgreSQL Connection
  await db.testConnection();

  app.listen(PORT, () => {
    console.log(`[Member 2 Server] Listening on http://localhost:${PORT}`);
    console.log(`- Healthcheck: http://localhost:${PORT}/health`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
