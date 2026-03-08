-- Tabela de ocorrências
CREATE TABLE ocorrencias (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo        text        UNIQUE NOT NULL,
  categoria        text        NOT NULL,  -- Manutenção | Barulho | Reclamação | Sugestão | Dúvida
  localizacao      text        NOT NULL,  -- Áreas comuns | Minha unidade | Garagem | Portaria
  assunto          text        NOT NULL,
  descricao        text        NOT NULL,
  urgencia         text        NOT NULL DEFAULT 'Média', -- Baixa | Média | Alta
  status           text        NOT NULL DEFAULT 'Aberto',
  -- Aberto | Em Análise | Em Atendimento | Pendente Terceiros | Concluído | Cancelado
  created_by       uuid        NOT NULL REFERENCES profiles(id),
  responsavel      text,
  resposta_interna text,
  resposta_morador text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Sequência para número do protocolo
CREATE SEQUENCE IF NOT EXISTS ocorrencias_protocolo_seq;

-- Trigger para gerar protocolo automaticamente
CREATE OR REPLACE FUNCTION gerar_protocolo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.protocolo := 'OC-' || to_char(NOW(), 'YYYY') ||
    LPAD(nextval('ocorrencias_protocolo_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_protocolo
  BEFORE INSERT ON ocorrencias
  FOR EACH ROW EXECUTE FUNCTION gerar_protocolo();

-- RLS
ALTER TABLE ocorrencias ENABLE ROW LEVEL SECURITY;

-- Morador vê apenas as suas; admin vê todas
CREATE POLICY "select_ocorrencias" ON ocorrencias
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Qualquer usuário autenticado pode criar (created_by deve ser o próprio uid)
CREATE POLICY "insert_ocorrencias" ON ocorrencias
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Somente admin pode atualizar
CREATE POLICY "update_ocorrencias" ON ocorrencias
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
