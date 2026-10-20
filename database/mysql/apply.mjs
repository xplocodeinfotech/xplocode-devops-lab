// Applies schema.sql to the database named by DB_*. Safe to run repeatedly.
import { readFile } from 'node:fs/promises';
import { connect, dbName } from './db.mjs';

const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
const connection = await connect({ multipleStatements: true });
try {
  await connection.query(schema);
  const [tables] = await connection.query('SHOW TABLES');
  console.log(`Schema applied to "${dbName}". Tables: ${tables.map((row) => Object.values(row)[0]).join(', ')}`);
} finally {
  await connection.end();
}
