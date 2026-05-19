# Supabase – Instalação do Módulo de Gestão de Projetos

## Pré-requisitos

- Conta no [Supabase](https://supabase.com)  
- Projeto Supabase criado
- [Supabase CLI](https://supabase.com/docs/guides/cli) instalado (opcional)

---

## 1. Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```bash
cp .env.example .env
```

Preencha com os valores do seu projeto Supabase:

```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

Os valores estão disponíveis em **Project Settings → API** no dashboard do Supabase.

---

## 2. Executar as migrations

### Opção A — Via SQL Editor (Supabase Dashboard)

1. Acesse **SQL Editor** no dashboard do seu projeto Supabase.
2. Execute os arquivos na ordem abaixo (copie e cole o conteúdo de cada um):

| Ordem | Arquivo | Descrição |
|-------|---------|-----------|
| 1 | `migrations/001_create_tables.sql` | Tabelas, índices e triggers |
| 2 | `migrations/002_rls_policies.sql` | Row Level Security e permissões |
| 3 | `migrations/003_storage_buckets.sql` | Buckets de armazenamento de arquivos |

### Opção B — Via Supabase CLI

```bash
# Na raiz do projeto
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

---

## 3. Estrutura das tabelas

### `clients` — Clientes
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `name` | TEXT | Nome do cliente |
| `contact` | TEXT | Telefone/contato |
| `email` | TEXT | E-mail |
| `description` | TEXT | Descrição livre |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Última atualização |

### `projects` — Projetos
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `name` | TEXT | Nome do projeto |
| `description` | TEXT | Descrição |
| `deadline` | DATE | Prazo |
| `value` | NUMERIC | Valor (R$) |
| `client_id` | UUID | FK → clients |
| `status` | TEXT | `ativo` / `concluido` / `pausado` / `cancelado` |

### `kanban_columns` — Colunas do Kanban
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `project_id` | UUID | FK → projects |
| `name` | TEXT | Nome da coluna |
| `color` | TEXT | Cor em hex (ex.: `#22c55e`) |
| `position` | INTEGER | Ordem de exibição |

### `tasks` — Tarefas
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `project_id` | UUID | FK → projects |
| `column_id` | UUID | FK → kanban_columns |
| `title` | TEXT | Título da tarefa |
| `description` | TEXT | Descrição |
| `deadline` | DATE | Prazo |
| `responsible` | TEXT | Responsável |
| `manual_time_minutes` | INTEGER | Tempo inserido manualmente (min) |
| `timer_seconds` | INTEGER | Tempo acumulado pelo cronômetro (s) |
| `status` | TEXT | `pendente` / `em_andamento` / `concluida` / `atrasada` |
| `position` | INTEGER | Posição na coluna |

### `task_todos` — To-do list por tarefa
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `task_id` | UUID | FK → tasks |
| `title` | TEXT | Texto do item |
| `completed` | BOOLEAN | Concluído? |
| `position` | INTEGER | Ordem de exibição |

### `task_timer_sessions` — Sessões do cronômetro
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `task_id` | UUID | FK → tasks |
| `started_at` | TIMESTAMPTZ | Início da sessão |
| `ended_at` | TIMESTAMPTZ | Fim da sessão |
| `duration_seconds` | INTEGER | Duração calculada |

### Tabelas de anexos
- `client_attachments` — Anexos de clientes
- `project_attachments` — Anexos de projetos  
- `task_attachments` — Anexos de tarefas

---

## 4. Storage Buckets

Os três buckets abaixo são criados automaticamente pela migration 003:

| Bucket | Uso |
|--------|-----|
| `project-attachments` | Arquivos de projetos |
| `task-attachments` | Arquivos de tarefas |
| `client-attachments` | Arquivos de clientes |

Todos permitem arquivos de até **50 MB** dos tipos: imagens, PDF, Word, Excel, TXT, ZIP.

---

## 5. Segurança (RLS)

Por padrão, as políticas são abertas (acesso via `anon key`) pois a autenticação é gerenciada externamente via webhook.

Se no futuro você migrar para **Supabase Auth (JWT)**, substitua as políticas em `002_rls_policies.sql` por políticas que usem `auth.uid()`:

```sql
-- Exemplo: somente o criador pode ver/editar seus projetos
CREATE POLICY "user_projects"
  ON projects FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
```

---

## 6. Verificação

Após executar as migrations, verifique no **Table Editor** do Supabase que as seguintes tabelas existem:

- `clients`
- `client_attachments`
- `projects`
- `project_members`
- `project_attachments`
- `kanban_columns`
- `tasks`
- `task_timer_sessions`
- `task_attachments`
- `task_todos`
