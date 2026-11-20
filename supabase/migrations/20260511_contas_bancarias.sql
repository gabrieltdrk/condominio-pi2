-- ═══════════════════════════════════════════════════════════════
-- Contas bancárias do condomínio
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS contas_bancarias (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condominio_id  uuid        NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nome           text        NOT NULL,
  tipo           text        NOT NULL DEFAULT 'conta_corrente'
                   CHECK (tipo IN ('conta_corrente', 'conta_poupanca', 'conta_bancaria', 'caixa', 'outro')),
  banco          text        NOT NULL,
  agencia        text        NOT NULL DEFAULT '',
  numero         text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Índice para buscas por condomínio
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS contas_bancarias_condominio_id_idx
  ON contas_bancarias (condominio_id);

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
ALTER TABLE contas_bancarias ENABLE ROW LEVEL SECURITY;

-- ADMIN e MASTER_ADMIN do condomínio podem ler
CREATE POLICY "contas_bancarias_select" ON contas_bancarias
  FOR SELECT
  USING (
    condominio_id IN (
      SELECT condominio_id FROM usuario_condominio
      WHERE user_id = auth.uid()
        AND active = true
        AND role IN ('ADMIN', 'MASTER_ADMIN')
    )
  );

-- Apenas via service role (admin client) para INSERT/UPDATE/DELETE
-- (a página usa getSupabaseAdmin que bypassa RLS)
