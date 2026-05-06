-- Permite que usuários autenticados leiam os condomínios aos quais estão vinculados
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'condominios' AND policyname = 'condominios_member_select'
  ) THEN
    CREATE POLICY condominios_member_select ON condominios
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM usuario_condominio uc
          WHERE uc.condominio_id = condominios.id
            AND uc.user_id = auth.uid()
            AND uc.active = true
        )
      );
  END IF;
END $$;
