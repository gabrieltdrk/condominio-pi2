-- Schema only. Run "npm run seed" to create tables AND insert seed data.

-- ─────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('MASTER_ADMIN', 'ADMIN', 'MORADOR', 'PORTEIRO');
  ELSE
    -- Add new values if missing (idempotent)
    BEGIN ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'MASTER_ADMIN'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'PORTEIRO'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resident_type') THEN
    CREATE TYPE resident_type AS ENUM ('PROPRIETARIO', 'INQUILINO', 'VISITANTE');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('ATIVO', 'INATIVO');
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- condominios  (tenant root)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS condominios (
  id          SERIAL        PRIMARY KEY,
  name        VARCHAR(200)  NOT NULL,
  cnpj        VARCHAR(18)   UNIQUE,
  address     TEXT,
  city        VARCHAR(120),
  state       VARCHAR(2),
  active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL        PRIMARY KEY,
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

-- ─────────────────────────────────────────────
-- usuario_condominio  (N:N — role per link)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario_condominio (
  id             SERIAL       PRIMARY KEY,
  user_id        INTEGER      NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  condominio_id  INTEGER      NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  role           user_role    NOT NULL DEFAULT 'MORADOR',
  active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, condominio_id)
);

-- ─────────────────────────────────────────────
-- apartments
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apartments (
  id             SERIAL      PRIMARY KEY,
  condominio_id  INTEGER     NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  tower          VARCHAR(32) NOT NULL,
  level          INTEGER     NOT NULL,
  number         VARCHAR(16) NOT NULL,
  user_id        INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (condominio_id, tower, level, number)
);

-- ─────────────────────────────────────────────
-- finance_entries
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS finance_entries (
  id             SERIAL        PRIMARY KEY,
  condominio_id  INTEGER       NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  type           VARCHAR(16)   NOT NULL CHECK (type IN ('REVENUE', 'EXPENSE')),
  identifier     VARCHAR(64)   NOT NULL,
  description    TEXT          NOT NULL,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  reference_date DATE          NOT NULL,
  due_date       DATE,
  counterparty   VARCHAR(160)  NOT NULL,
  unit           VARCHAR(64),
  resident       VARCHAR(160),
  category       VARCHAR(80)   NOT NULL,
  payment_method VARCHAR(32)   NOT NULL,
  status         VARCHAR(32)   NOT NULL,
  document_name  VARCHAR(255),
  notes          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (condominio_id, identifier)
);

-- ─────────────────────────────────────────────
-- finance_bills
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS finance_bills (
  id              SERIAL        PRIMARY KEY,
  condominio_id   INTEGER       NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  entry_id        INTEGER       NOT NULL REFERENCES finance_entries(id) ON DELETE CASCADE,
  bill_code       VARCHAR(64)   NOT NULL,
  unit            VARCHAR(64)   NOT NULL,
  resident        VARCHAR(160)  NOT NULL,
  resident_email  VARCHAR(255),
  competence_date DATE          NOT NULL,
  issue_date      DATE          NOT NULL,
  due_date        DATE          NOT NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  instructions    TEXT,
  status          VARCHAR(16)   NOT NULL CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')),
  digitable_line  VARCHAR(128)  NOT NULL,
  barcode         VARCHAR(64)   NOT NULL,
  pdf_url         VARCHAR(255),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (condominio_id, bill_code)
);
