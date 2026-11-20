-- ═══════════════════════════════════════════════════════════════
-- Recursos do condomínio (piscina, salão, etc.)
-- slug é o resource_id usado em resource_bookings
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recursos_condominio (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condominio_id  uuid        NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nome           text        NOT NULL,
  descricao      text,
  slug           text        NOT NULL,
  icone          text        NOT NULL DEFAULT 'default',
  ativo          boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (condominio_id, slug)
);

CREATE INDEX IF NOT EXISTS recursos_condominio_cond_idx ON recursos_condominio (condominio_id);

-- RLS
ALTER TABLE recursos_condominio ENABLE ROW LEVEL SECURITY;

-- Membros do condomínio podem ler os recursos ativos
CREATE POLICY "recursos_select" ON recursos_condominio
  FOR SELECT
  USING (
    condominio_id IN (
      SELECT condominio_id FROM usuario_condominio
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Escrita via service role (admin client)
