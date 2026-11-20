-- Adiciona colunas extras à tabela condominios
-- Idempotente: pode ser executado mais de uma vez

ALTER TABLE condominios
  ADD COLUMN IF NOT EXISTS zip_code            text,
  ADD COLUMN IF NOT EXISTS neighborhood        text,
  ADD COLUMN IF NOT EXISTS number              text,
  ADD COLUMN IF NOT EXISTS reference           text,
  ADD COLUMN IF NOT EXISTS manager_name        text,
  ADD COLUMN IF NOT EXISTS manager_phone       text,
  ADD COLUMN IF NOT EXISTS management_company  text,
  ADD COLUMN IF NOT EXISTS has_pool            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pool_count          integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_gym             boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gym_count           integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_party_room      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS party_room_count    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_bbq             boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bbq_count           integer NOT NULL DEFAULT 0;
