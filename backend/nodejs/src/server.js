import { createApp } from './app.js';
import { getConfig } from './config/index.js';

const config = getConfig();
let app;
try {
  app = createApp(config);
  await app.locals.repository.check();
  console.log(`Database connected: ${app.locals.repository.label}.`);
} catch (error) {
  console.error(error.message); // a one-line explanation instead of a stack trace
  process.exit(1);
}

const server = app.listen(config.port, '0.0.0.0', () => console.log(`Student API listening on port ${config.port}`));

// Cloud Run sends SIGTERM before stopping an instance.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(async () => { await app.locals.repository.close(); process.exit(0); }));
}
