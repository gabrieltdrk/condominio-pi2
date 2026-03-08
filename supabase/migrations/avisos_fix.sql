-- Fix: SECURITY DEFINER permite que o trigger insira notificações para todos
-- sem violar a RLS (roda como o dono da função, não como o usuário logado)
CREATE OR REPLACE FUNCTION criar_notificacoes_aviso()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notificacoes (user_id, aviso_id)
  SELECT id, NEW.id FROM profiles
  ON CONFLICT (user_id, aviso_id) DO NOTHING;
  RETURN NEW;
END;
$$;
