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

CREATE INDEX IF NOT EXISTS finance_bills_due_date_idx ON finance_bills (due_date);
CREATE INDEX IF NOT EXISTS finance_bills_status_idx ON finance_bills (status);
CREATE INDEX IF NOT EXISTS finance_bills_resident_email_idx ON finance_bills (resident_email);
