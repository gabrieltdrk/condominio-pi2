-- Adiciona flag de privacidade na ocorrência
ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS privado boolean NOT NULL DEFAULT false;

-- Atualiza política de SELECT: morador vê as suas + as públicas; admin vê tudo
DROP POLICY IF EXISTS "select_ocorrencias" ON ocorrencias;
CREATE POLICY "select_ocorrencias" ON ocorrencias
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
    OR created_by = auth.uid()
    OR privado = false
  );

-- Permite que o dono da ocorrência atualize assunto/descrição/categoria/privado
DROP POLICY IF EXISTS "update_ocorrencias" ON ocorrencias;

CREATE POLICY "update_ocorrencias_admin" ON ocorrencias
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "update_ocorrencias_owner" ON ocorrencias
  FOR UPDATE USING (created_by = auth.uid());
