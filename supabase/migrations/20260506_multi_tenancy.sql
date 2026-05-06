-- ═══════════════════════════════════════════════════════════════
-- Multi-tenancy: condominios + usuario_condominio + condominio_id
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. MASTER_ADMIN role in profiles
-- ─────────────────────────────────────────────
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('MASTER_ADMIN', 'ADMIN', 'MORADOR', 'PORTEIRO'));

-- ─────────────────────────────────────────────
-- 2. condominios table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS condominios (
  id          uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text          NOT NULL,
  cnpj        text          UNIQUE,
  address     text,
  city        text,
  state       text,
  active      boolean       NOT NULL DEFAULT true,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE condominios ENABLE ROW LEVEL SECURITY;

-- Only MASTER_ADMIN can manage condominios
CREATE POLICY condominios_master_select ON condominios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'MASTER_ADMIN'
    )
  );

CREATE POLICY condominios_master_insert ON condominios
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'MASTER_ADMIN'
    )
  );

CREATE POLICY condominios_master_update ON condominios
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'MASTER_ADMIN'
    )
  );

-- ─────────────────────────────────────────────
-- 3. usuario_condominio (N:N)
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

ALTER TABLE usuario_condominio ENABLE ROW LEVEL SECURITY;

-- Helper: returns the active condominio_id for the current user (from app_metadata)
CREATE OR REPLACE FUNCTION auth_condominio_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'condominio_id')::uuid;
$$;

-- MASTER_ADMIN sees all; users see only their own links
CREATE POLICY uc_select ON usuario_condominio
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'MASTER_ADMIN'
    )
  );

CREATE POLICY uc_master_insert ON usuario_condominio
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'MASTER_ADMIN'
    )
  );

CREATE POLICY uc_master_delete ON usuario_condominio
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'MASTER_ADMIN'
    )
  );

-- ─────────────────────────────────────────────
-- 4. Add condominio_id to tenant tables
--    All nullable for backwards compat; enforce NOT NULL after data migration.
-- ─────────────────────────────────────────────

-- condo_apartments
ALTER TABLE condo_apartments
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS condo_apartments_condominio_idx
  ON condo_apartments (condominio_id);

-- messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS messages_condominio_idx
  ON messages (condominio_id, created_at DESC);

-- visitor_requests
ALTER TABLE visitor_requests
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS visitor_requests_condominio_idx
  ON visitor_requests (condominio_id, created_at DESC);

-- system_notifications
ALTER TABLE system_notifications
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

-- deliveries
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS deliveries_condominio_idx
  ON deliveries (condominio_id, received_at DESC);

-- polls
ALTER TABLE polls
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS polls_condominio_idx
  ON polls (condominio_id, created_at DESC);

-- maintenance_orders
ALTER TABLE maintenance_orders
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS maintenance_orders_condominio_idx
  ON maintenance_orders (condominio_id, scheduled_date DESC);

-- resource_bookings
ALTER TABLE resource_bookings
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS resource_bookings_condominio_idx
  ON resource_bookings (condominio_id, booking_date DESC);

-- ─────────────────────────────────────────────
-- 5. Update RLS policies to filter by condominio_id
--    where auth_condominio_id() is set (non-null)
-- ─────────────────────────────────────────────

-- condo_apartments: scope existing select policy
DROP POLICY IF EXISTS select_condo_apartments ON condo_apartments;
CREATE POLICY select_condo_apartments ON condo_apartments
  FOR SELECT USING (
    -- MASTER_ADMIN sees all; others scoped to their condominio
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'MASTER_ADMIN')
    OR condominio_id IS NULL  -- legacy rows without tenant
    OR condominio_id = auth_condominio_id()
  );

DROP POLICY IF EXISTS update_condo_apartments_admin ON condo_apartments;
CREATE POLICY update_condo_apartments_admin ON condo_apartments
  FOR ALL USING (
    condominio_id = auth_condominio_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MASTER_ADMIN')
    )
  );

-- messages
DROP POLICY IF EXISTS authenticated_can_read_messages ON messages;
CREATE POLICY authenticated_can_read_messages ON messages
  FOR SELECT USING (
    condominio_id IS NULL
    OR condominio_id = auth_condominio_id()
  );

DROP POLICY IF EXISTS users_can_insert_own_messages ON messages;
CREATE POLICY users_can_insert_own_messages ON messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (condominio_id IS NULL OR condominio_id = auth_condominio_id())
  );

-- polls
DROP POLICY IF EXISTS insert_admin_only ON polls;
CREATE POLICY insert_admin_only ON polls
  FOR INSERT WITH CHECK (
    condominio_id = auth_condominio_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MASTER_ADMIN')
    )
  );

DROP POLICY IF EXISTS update_admin_only ON polls;
CREATE POLICY update_admin_only ON polls
  FOR UPDATE USING (
    condominio_id = auth_condominio_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MASTER_ADMIN')
    )
  );

DROP POLICY IF EXISTS delete_admin_only ON polls;
CREATE POLICY delete_admin_only ON polls
  FOR DELETE USING (
    condominio_id = auth_condominio_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MASTER_ADMIN')
    )
  );

-- ─────────────────────────────────────────────
-- 6. updated_at trigger for condominios
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
