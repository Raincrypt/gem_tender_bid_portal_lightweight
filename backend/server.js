/* global process */
import app from './src/app.js';
import { DEFAULT_PORT } from './src/config/config.js';
import { initDbTables } from './src/db/db.js';
import { logServer } from './src/services/logService.js';

const PORT = process.env.PORT || DEFAULT_PORT;

async function start() {
  // Initialize tables on startup
  await initDbTables();

  logServer('Server started');

  app.listen(PORT, () => {
    logServer(`Server listening on port ${PORT}`);
    console.log(`PostgreSQL API listening on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
