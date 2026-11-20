-- Adiciona condominio_id à tabela avisos
-- Idempotente

ALTER TABLE avisos
  ADD COLUMN IF NOT EXISTS condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS avisos_condominio_idx
  ON avisos (condominio_id, created_at DESC);
