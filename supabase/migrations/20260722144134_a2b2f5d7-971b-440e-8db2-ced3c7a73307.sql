
CREATE POLICY "Users read their own resume photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resume-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload their own resume photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resume-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update their own resume photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'resume-photos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'resume-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete their own resume photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'resume-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
