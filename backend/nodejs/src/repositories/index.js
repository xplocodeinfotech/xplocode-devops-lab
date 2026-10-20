import { createMysqlRepository } from './mysql.js';
import { createCatalystRepository } from './catalyst.js';

// DB_PROVIDER picks the repository. Every repository has the same functions plus label, check() and close().
export function createRepository(config, provider = process.env.DB_PROVIDER ?? 'mysql') {
  if (provider === 'mysql') return createMysqlRepository(config);
  if (provider === 'catalyst') return createCatalystRepository(config);
  throw new Error(`DB_PROVIDER "${provider}" is not implemented yet.`);
}
