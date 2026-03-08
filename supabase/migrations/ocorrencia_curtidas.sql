-- Tabela de curtidas em ocorrências
CREATE TABLE ocorrencia_curtidas (
  ocorrencia_id uuid NOT NULL REFERENCES ocorrencias(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ocorrencia_id, user_id)
);

-- RLS
ALTER TABLE ocorrencia_curtidas ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode visualizar as curtidas
CREATE POLICY "select_curtidas" ON ocorrencia_curtidas
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Usuário só pode inserir a própria curtida
CREATE POLICY "insert_curtidas" ON ocorrencia_curtidas
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Usuário só pode remover a própria curtida
CREATE POLICY "delete_curtidas" ON ocorrencia_curtidas
  FOR DELETE USING (user_id = auth.uid());
