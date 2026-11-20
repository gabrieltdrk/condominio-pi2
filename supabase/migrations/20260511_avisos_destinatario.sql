-- Adiciona coluna destinatario_user_id na tabela avisos
-- NULL = aviso para o condomínio inteiro
-- UUID = aviso para uma pessoa específica

ALTER TABLE avisos ADD COLUMN IF NOT EXISTS destinatario_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
