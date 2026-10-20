-- Demo data (run schema.sql first). `npm run setup` in database/mysql does schema + seed for you;
-- use this file when you only have a SQL client. Safe to run more than once.

-- Demo login: username learner, password learner123 (plain text, demo only).
INSERT INTO users (username, password) VALUES ('learner', 'learner123')
  ON DUPLICATE KEY UPDATE password = VALUES(password);

-- Sample students (ids are generated automatically).
INSERT IGNORE INTO students (name, email, year) VALUES
  ('Arun Kumar',      'arun@gmail.com',    3),
  ('Priya Mohan',     'priya@outlook.com', 2),
  ('Shantha lakshmi', 'shantha@zoho.com',  4);

-- Quick checks
-- SELECT id, name, email, year FROM students ORDER BY id;
-- SELECT id, username FROM users;
