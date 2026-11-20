-- Coluna para soft delete / bloqueio de acesso
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS removed boolean NOT NULL DEFAULT false;

-- Data de nascimento (preenchida pelo próprio usuário no fluxo de convite)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_nascimento date NULL;

-- Index para filtrar usuários habilitados rapidamente
CREATE INDEX IF NOT EXISTS idx_profiles_removed ON profiles(removed);
