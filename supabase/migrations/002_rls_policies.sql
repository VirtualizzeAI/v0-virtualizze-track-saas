-- ============================================================
-- Virtualizze Track – Gestão de Projetos e Tarefas
-- Migration 002: Row Level Security (RLS)
-- ============================================================
-- ATENÇÃO: Esta aplicação utiliza autenticação customizada via webhook,
-- não o sistema de autenticação nativo do Supabase.
-- Por isso, as políticas abaixo permitem acesso irrestrito via anon key.
--
-- Se no futuro você migrar para Supabase Auth (JWT), substitua as
-- políticas "TRUE" por políticas baseadas em auth.uid().
-- ============================================================

-- ── Habilitar RLS em todas as tabelas ──────────────────────

ALTER TABLE clients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_attachments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_attachments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_timer_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_todos            ENABLE ROW LEVEL SECURITY;

-- ── Políticas permissivas (auth customizada via anon key) ──

-- clients
CREATE POLICY "allow_all_clients"
  ON clients FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- client_attachments
CREATE POLICY "allow_all_client_attachments"
  ON client_attachments FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- projects
CREATE POLICY "allow_all_projects"
  ON projects FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- project_members
CREATE POLICY "allow_all_project_members"
  ON project_members FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- project_attachments
CREATE POLICY "allow_all_project_attachments"
  ON project_attachments FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- kanban_columns
CREATE POLICY "allow_all_kanban_columns"
  ON kanban_columns FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- tasks
CREATE POLICY "allow_all_tasks"
  ON tasks FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- task_timer_sessions
CREATE POLICY "allow_all_task_timer_sessions"
  ON task_timer_sessions FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- task_attachments
CREATE POLICY "allow_all_task_attachments"
  ON task_attachments FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- task_todos
CREATE POLICY "allow_all_task_todos"
  ON task_todos FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ── Permissões para a role anon ────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON clients             TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_attachments  TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON projects            TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_members     TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_attachments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON kanban_columns      TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks               TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_timer_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_attachments    TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_todos          TO anon;

-- ── Permissões para a role authenticated ───────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON clients             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_attachments  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON projects            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_members     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kanban_columns      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_timer_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_attachments    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_todos          TO authenticated;
