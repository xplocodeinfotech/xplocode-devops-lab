// Adds the demo login and a few sample students. Safe to run more than once.
// Demo only: the password is stored as plain text (default learner / learner123, override with SEED_PASSWORD).
import { connect } from './db.mjs';

const username = 'learner';
const password = process.env.SEED_PASSWORD || 'learner123';
const connection = await connect();
try {
  await connection.execute(
    'INSERT INTO users (username, password) VALUES (?, ?) ON DUPLICATE KEY UPDATE password = VALUES(password)',
    [username, password],
  );
  console.log(`Demo login ready: username "${username}", password "${password}"`);

  const [[{ total }]] = await connection.query('SELECT COUNT(*) AS total FROM students');
  if (total === 0) {
    const samples = [
      ['Arun Kumar', 'arun@gmail.com', 3],
      ['Priya Mohan', 'priya@outlook.com', 2],
      ['Shantha lakshmi', 'shantha@zoho.com', 4],
    ];
    for (const row of samples) await connection.execute('INSERT INTO students (name, email, year) VALUES (?, ?, ?)', row);
    console.log(`Inserted ${samples.length} sample students.`);
  } else {
    console.log(`students table already has ${total} rows; no samples added.`);
  }
} finally {
  await connection.end();
}
