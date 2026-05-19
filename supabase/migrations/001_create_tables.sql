-- ============================================================
-- Virtualizze Track – Gestão de Projetos e Tarefas
-- Migration 001: Criação das tabelas principais
-- ============================================================

-- Habilitar extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────
-- CLIENTES
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  contact     TEXT,
  email       TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_attachments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  file_name   TEXT        NOT NULL,
  file_url    TEXT        NOT NULL,
  file_size   BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- PROJETOS
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  deadline    DATE,
  value       NUMERIC(14,2),
  client_id   UUID        REFERENCES clients(id) ON DELETE SET NULL,
  status      TEXT        NOT NULL DEFAULT 'ativo'
                          CHECK (status IN ('ativo', 'concluido', 'pausado', 'cancelado')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Responsáveis do projeto (lista de nomes, podem ser usuários externos)
CREATE TABLE IF NOT EXISTS project_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  email       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_attachments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name   TEXT        NOT NULL,
  file_url    TEXT        NOT NULL,
  file_size   BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- KANBAN – COLUNAS
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kanban_columns (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  color       TEXT        NOT NULL DEFAULT '#22c55e',
  position    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- TAREFAS
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  column_id           UUID        REFERENCES kanban_columns(id) ON DELETE SET NULL,
  title               TEXT        NOT NULL,
  description         TEXT,
  deadline            DATE,
  responsible         TEXT,
  manual_time_minutes INTEGER     NOT NULL DEFAULT 0,  -- tempo inserido manualmente (minutos)
  timer_seconds       INTEGER     NOT NULL DEFAULT 0,  -- tempo acumulado pelo cronômetro (segundos)
  status              TEXT        NOT NULL DEFAULT 'pendente'
                                  CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'atrasada')),
  position            INTEGER     NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessões do cronômetro (cada vez que o usuário dá play/pause)
CREATE TABLE IF NOT EXISTS task_timer_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id          UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_attachments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name   TEXT        NOT NULL,
  file_url    TEXT        NOT NULL,
  file_size   BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- To-do list dentro de cada tarefa
CREATE TABLE IF NOT EXISTS task_todos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  completed   BOOLEAN     NOT NULL DEFAULT FALSE,
  position    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- TRIGGERS: atualizar updated_at automaticamente
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ──────────────────────────────────────────────────────────
-- ÍNDICES
-- ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_client_id      ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status         ON projects(status);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_project  ON kanban_columns(project_id, position);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id        ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id         ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status            ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_todos_task_id      ON task_todos(task_id, position);
CREATE INDEX IF NOT EXISTS idx_task_timer_task_id      ON task_timer_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_client_attachments      ON client_attachments(client_id);
CREATE INDEX IF NOT EXISTS idx_project_attachments     ON project_attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments        ON task_attachments(task_id);
