-- ── Coluna removed ────────────────────────────────────────────────────────
ALTER TABLE avisos ADD COLUMN IF NOT EXISTS removed boolean NOT NULL DEFAULT false;

-- Marca imediatamente os já expirados como removed
UPDATE avisos
SET removed = true, updated_at = now()
WHERE data_expiracao IS NOT NULL
  AND data_expiracao < CURRENT_DATE
  AND removed = false;

-- ── Extensão pg_cron ──────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── Função que arquiva avisos expirados ───────────────────────────────────
CREATE OR REPLACE FUNCTION expire_avisos_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE avisos
  SET removed = true, updated_at = now()
  WHERE data_expiracao IS NOT NULL
    AND data_expiracao < CURRENT_DATE
    AND removed = false;
END;
$$;

-- ── Agendamento: todo dia à meia-noite ───────────────────────────────────
-- Remove o job anterior se existir (idempotente)
DO $$
BEGIN
  PERFORM cron.unschedule('expire-avisos-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

SELECT cron.schedule(
  'expire-avisos-daily',
  '0 0 * * *',
  'SELECT expire_avisos_job()'
);
