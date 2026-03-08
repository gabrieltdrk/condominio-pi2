-- Adiciona coluna motivo_cancelamento na tabela ocorrencias
ALTER TABLE ocorrencias
  ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;
