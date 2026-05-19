-- ============================================================
-- Virtualizze Track – Gestão de Projetos e Tarefas
-- Migration 003: Storage Buckets para Arquivos
-- ============================================================
-- Execute este script no SQL Editor do Supabase Dashboard
-- OU via Supabase CLI após as migrations anteriores.
-- ============================================================

-- Bucket para anexos de projetos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-attachments',
  'project-attachments',
  TRUE,
  52428800, -- 50MB
  ARRAY['image/*', 'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'application/zip', 'application/x-zip-compressed']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket para anexos de tarefas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  TRUE,
  52428800, -- 50MB
  ARRAY['image/*', 'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'application/zip', 'application/x-zip-compressed']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket para anexos de clientes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-attachments',
  'client-attachments',
  TRUE,
  52428800, -- 50MB
  ARRAY['image/*', 'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'application/zip', 'application/x-zip-compressed']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao Storage (acesso público)
CREATE POLICY "allow_public_read_project_attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-attachments');

CREATE POLICY "allow_public_insert_project_attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-attachments');

CREATE POLICY "allow_public_delete_project_attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-attachments');

CREATE POLICY "allow_public_read_task_attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-attachments');

CREATE POLICY "allow_public_insert_task_attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "allow_public_delete_task_attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'task-attachments');

CREATE POLICY "allow_public_read_client_attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-attachments');

CREATE POLICY "allow_public_insert_client_attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-attachments');

CREATE POLICY "allow_public_delete_client_attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'client-attachments');
