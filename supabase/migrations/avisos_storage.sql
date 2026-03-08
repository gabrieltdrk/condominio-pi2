-- Bucket público para anexos de avisos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avisos-anexos',
  'avisos-anexos',
  true,
  10485760, -- 10 MB
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Qualquer autenticado pode fazer upload
CREATE POLICY "upload_avisos_anexos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avisos-anexos' AND auth.uid() IS NOT NULL);

-- Leitura pública
CREATE POLICY "public_read_avisos_anexos" ON storage.objects
  FOR SELECT USING (bucket_id = 'avisos-anexos');

-- Admin pode deletar
CREATE POLICY "delete_avisos_anexos" ON storage.objects
  FOR DELETE USING (bucket_id = 'avisos-anexos' AND auth.uid() IS NOT NULL);
