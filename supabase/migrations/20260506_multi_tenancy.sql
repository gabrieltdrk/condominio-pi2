-- ═══════════════════════════════════════════════════════════════
-- Multi-tenancy: condominios + usuario_condominio + condominio_id
-- Idempotente: pode ser executado mais de uma vez sem erro
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. MASTER_ADMIN role em profiles
-- ─────────────────────────────────────────────
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('MASTER_ADMIN', 'ADMIN', 'MORADOR', 'PORTEIRO'));

-- ─────────────────────────────────────────────
-- 2. Tabela condominios
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS condominios (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  cnpj        text        UNIQUE,
  address     text,
  city        text,
  state       text,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE condominios ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'condominios' AND policyname = 'condominios_master_select'
  ) THEN
    CREATE POLICY condominios_master_select ON condominios
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'MASTER_ADMIN')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'condominios' AND policyname = 'condominios_master_insert'
  ) THEN
    CREATE POLICY condominios_master_insert ON condominios
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'MASTER_ADMIN')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'condominios' AND policyname = 'condominios_master_update'
  ) THEN
    CREATE POLICY condominios_master_update ON condominios
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'MASTER_ADMIN')
      );
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 3. Tabela usuario_condominio (N:N)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario_condominio (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid        NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
  condominio_id  uuid        NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  role           text        NOT NULL DEFAULT 'MORADOR'
                             CHECK (role IN ('ADMIN', 'MORADOR', 'PORTEIRO')),
  active         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, condominio_id)
);

-- Garante colunas mesmo se tabela já existia com schema diferente
ALTER TABLE usuario_condominio
  ADD COLUMN IF NOT EXISTS user_id        uuid    REFERENCES profiles(id)    ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS condominio_id  uuid    REFERENCES condominios(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS role           text    DEFAULT 'MORADOR',
  ADD COLUMN IF NOT EXISTS active         boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at     timestamptz DEFAULT now();

ALTER TABLE usuario_condominio ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 4. Helper RLS: condominio_id ativo do token
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auth_condominio_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'condominio_id')::uuid;
$$;

-- ─────────────────────────────────────────────
-- 5. Políticas de usuario_condominio
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usuario_condominio' AND policyname = 'uc_select') THEN
    CREATE POLICY uc_select ON usuario_condominio
      FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'MASTER_ADMIN')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usuario_condominio' AND policyname = 'uc_master_insert') THEN
    CREATE POLICY uc_master_insert ON usuario_condominio
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'MASTER_ADMIN')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usuario_condominio' AND policyname = 'uc_master_delete') THEN
    CREATE POLICY uc_master_delete ON usuario_condominio
      FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'MASTER_ADMIN')
      );
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 6. Adiciona condominio_id nas tabelas tenant
--    Nullable para compatibilidade com dados existentes
-- ─────────────────────────────────────────────
ALTER TABLE condo_apartments
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS condo_apartments_condominio_idx
  ON condo_apartments (condominio_id);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS messages_condominio_idx
  ON messages (condominio_id, created_at DESC);

ALTER TABLE visitor_requests
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS visitor_requests_condominio_idx
  ON visitor_requests (condominio_id, created_at DESC);

ALTER TABLE system_notifications
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS deliveries_condominio_idx
  ON deliveries (condominio_id, received_at DESC);

ALTER TABLE polls
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS polls_condominio_idx
  ON polls (condominio_id, created_at DESC);

ALTER TABLE maintenance_orders
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS maintenance_orders_condominio_idx
  ON maintenance_orders (condominio_id, scheduled_date DESC);

ALTER TABLE resource_bookings
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS resource_bookings_condominio_idx
  ON resource_bookings (condominio_id, booking_date DESC);

-- ─────────────────────────────────────────────
-- 7. Atualiza RLS de condo_apartments
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS select_condo_apartments ON condo_apartments;
CREATE POLICY select_condo_apartments ON condo_apartments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'MASTER_ADMIN')
    OR condominio_id IS NULL
    OR condominio_id = auth_condominio_id()
  );

DROP POLICY IF EXISTS update_condo_apartments_admin ON condo_apartments;
CREATE POLICY update_condo_apartments_admin ON condo_apartments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MASTER_ADMIN'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MASTER_ADMIN'))
  );

-- ─────────────────────────────────────────────
-- 8. Atualiza RLS de messages
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS authenticated_can_read_messages ON messages;
CREATE POLICY authenticated_can_read_messages ON messages
  FOR SELECT USING (
    condominio_id IS NULL
    OR condominio_id = auth_condominio_id()
  );

DROP POLICY IF EXISTS users_can_insert_own_messages ON messages;
CREATE POLICY users_can_insert_own_messages ON messages
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (condominio_id IS NULL OR condominio_id = auth_condominio_id())
  );

-- ─────────────────────────────────────────────
-- 9. Atualiza RLS de polls
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS insert_admin_only ON polls;
CREATE POLICY insert_admin_only ON polls
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MASTER_ADMIN'))
    AND (condominio_id IS NULL OR condominio_id = auth_condominio_id())
  );

DROP POLICY IF EXISTS update_admin_only ON polls;
CREATE POLICY update_admin_only ON polls
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MASTER_ADMIN'))
  );

DROP POLICY IF EXISTS delete_admin_only ON polls;
CREATE POLICY delete_admin_only ON polls
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MASTER_ADMIN'))
  );

-- ─────────────────────────────────────────────
-- 10. Trigger updated_at em condominios
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS condominios_set_updated_at ON condominios;
CREATE TRIGGER condominios_set_updated_at
  BEFORE UPDATE ON condominios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
