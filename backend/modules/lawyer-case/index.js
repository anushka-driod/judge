/**
 * Standalone Service Entry Point for Member 4
 * EarnLaw — Legal Knowledge, Lawyer System & Case Management
 *
 * Can be run standalone:
 *   node backend/modules/lawyer-case/index.js
 * Or imported by Member 2 into the main backend app:
 *   import lawyerCaseRoutes from './backend/modules/lawyer-case/src/routes/index.js';
 *   app.use('/api', lawyerCaseRoutes);
 */

import express from 'express';
import lawyerCaseRoutes from './src/routes/index.js';

const app = express();
const PORT = process.env.PORT || 5002;

app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
  res.json({
    service: 'EarnLaw Member 4 — Legal Knowledge, Lawyer System & Case Management',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

// Mount domain routes
app.use('/api', lawyerCaseRoutes);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[EarnLaw Member 4 Service] Running on http://localhost:${PORT}`);
    console.log(`- Lawyer Matching & Recommendations: http://localhost:${PORT}/api/lawyers/recommendations`);
    console.log(`- Legal Knowledge & Statutes:        http://localhost:${PORT}/api/legal/laws`);
  });
}

export default app;
