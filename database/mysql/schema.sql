-- MySQL 8 schema for the Student Management workshop DEMO.
-- Running this resets the demo: both tables are dropped and recreated, then seed.sql / seed.mjs refill them.
-- Passwords are plain text and emails are stored in lower case (the backend lower-cases them).

DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_users_username (username)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS students;
CREATE TABLE students (
  id    INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  year  TINYINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_students_email (email)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
