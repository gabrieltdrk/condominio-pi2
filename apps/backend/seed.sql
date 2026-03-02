-- Schema only. Run "npm run seed" to create tables AND insert seed users.

CREATE TYPE IF NOT EXISTS user_role AS ENUM ('ADMIN', 'MORADOR');

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash TEXT          NOT NULL,
  role          user_role     NOT NULL DEFAULT 'MORADOR',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
