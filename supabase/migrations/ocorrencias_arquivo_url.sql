-- Coluna de anexo na tabela ocorrencias
ALTER TABLE ocorrencias
  ADD COLUMN IF NOT EXISTS arquivo_url TEXT;

-- Bucket para anexos de ocorrências
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ocorrencias-anexos',
  'ocorrencias-anexos',
  true,
  10485760, -- 10 MB
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Qualquer autenticado pode fazer upload
CREATE POLICY "upload_ocorrencias_anexos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ocorrencias-anexos' AND auth.uid() IS NOT NULL);

-- Leitura pública
CREATE POLICY "public_read_ocorrencias_anexos" ON storage.objects
  FOR SELECT USING (bucket_id = 'ocorrencias-anexos');

-- Dono ou admin pode deletar
CREATE POLICY "delete_ocorrencias_anexos" ON storage.objects
  FOR DELETE USING (bucket_id = 'ocorrencias-anexos' AND auth.uid() IS NOT NULL);
