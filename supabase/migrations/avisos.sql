-- ── Tabela de avisos ──────────────────────────────────────────────────────
CREATE TABLE avisos (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo         text        NOT NULL,
  descricao      text        NOT NULL,
  tipo           text        NOT NULL DEFAULT 'Informativo',
  -- Manutenção | Assembleia | Segurança | Informativo | Eventos
  fixado         boolean     NOT NULL DEFAULT false,
  data_expiracao date        NULL,
  arquivo_url    text        NULL,
  created_by     uuid        NOT NULL REFERENCES profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Curtidas em avisos ────────────────────────────────────────────────────
CREATE TABLE aviso_curtidas (
  aviso_id   uuid NOT NULL REFERENCES avisos(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (aviso_id, user_id)
);

-- ── Notificações ──────────────────────────────────────────────────────────
CREATE TABLE notificacoes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  aviso_id   uuid        NOT NULL REFERENCES avisos(id)  ON DELETE CASCADE,
  lida       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, aviso_id)
);

-- ── Trigger: criar notificação para todos ao publicar aviso ───────────────
CREATE OR REPLACE FUNCTION criar_notificacoes_aviso()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notificacoes (user_id, aviso_id)
  SELECT id, NEW.id FROM profiles
  ON CONFLICT (user_id, aviso_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notificar_aviso
  AFTER INSERT ON avisos
  FOR EACH ROW EXECUTE FUNCTION criar_notificacoes_aviso();

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE avisos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE aviso_curtidas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes    ENABLE ROW LEVEL SECURITY;

-- Avisos: todos autenticados leem; somente admin cria/edita/remove
CREATE POLICY "select_avisos"  ON avisos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "insert_avisos"  ON avisos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "update_avisos"  ON avisos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "delete_avisos"  ON avisos FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Curtidas: todos leem; cada um gerencia as suas
CREATE POLICY "select_aviso_curtidas" ON aviso_curtidas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "insert_aviso_curtidas" ON aviso_curtidas FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete_aviso_curtidas" ON aviso_curtidas FOR DELETE USING (user_id = auth.uid());

-- Notificações: cada usuário vê e gerencia apenas as suas
CREATE POLICY "select_notificacoes" ON notificacoes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "update_notificacoes" ON notificacoes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "delete_notificacoes" ON notificacoes FOR DELETE USING (user_id = auth.uid());
