-- Schema only. Run "npm run seed" to create tables AND insert seed users.

CREATE TYPE IF NOT EXISTS user_role AS ENUM ('ADMIN', 'MORADOR');
CREATE TYPE IF NOT EXISTS resident_type AS ENUM ('PROPRIETARIO', 'INQUILINO', 'VISITANTE');
CREATE TYPE IF NOT EXISTS user_status AS ENUM ('ATIVO', 'INATIVO');

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash TEXT          NOT NULL,
  role          user_role     NOT NULL DEFAULT 'MORADOR',
  phone         VARCHAR(32),
  resident_type resident_type NOT NULL DEFAULT 'PROPRIETARIO',
  status        user_status   NOT NULL DEFAULT 'ATIVO',
  car_plate     VARCHAR(16),
  pets_count    INTEGER,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apartments (
  id          SERIAL PRIMARY KEY,
  tower       VARCHAR(32) NOT NULL,
  level       INTEGER NOT NULL,
  number      VARCHAR(16) NOT NULL,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (tower, level, number)
);

CREATE TABLE IF NOT EXISTS finance_entries (
  id             SERIAL PRIMARY KEY,
  type           VARCHAR(16) NOT NULL CHECK (type IN ('REVENUE', 'EXPENSE')),
  identifier     VARCHAR(64) NOT NULL UNIQUE,
  description    TEXT NOT NULL,
  amount         NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  reference_date DATE NOT NULL,
  due_date       DATE,
  counterparty   VARCHAR(160) NOT NULL,
  unit           VARCHAR(64),
  resident       VARCHAR(160),
  category       VARCHAR(80) NOT NULL,
  payment_method VARCHAR(32) NOT NULL,
  status         VARCHAR(32) NOT NULL,
  document_name  VARCHAR(255),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_bills (
  id              SERIAL PRIMARY KEY,
  entry_id        INTEGER NOT NULL REFERENCES finance_entries(id) ON DELETE CASCADE,
  bill_code       VARCHAR(64) NOT NULL UNIQUE,
  unit            VARCHAR(64) NOT NULL,
  resident        VARCHAR(160) NOT NULL,
  resident_email  VARCHAR(255),
  competence_date DATE NOT NULL,
  issue_date      DATE NOT NULL,
  due_date        DATE NOT NULL,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  instructions    TEXT,
  status          VARCHAR(16) NOT NULL CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')),
  digitable_line  VARCHAR(128) NOT NULL,
  barcode         VARCHAR(64) NOT NULL,
  pdf_url         VARCHAR(255),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
