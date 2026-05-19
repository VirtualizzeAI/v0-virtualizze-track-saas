import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados. ' +
    'Crie um arquivo .env baseado no .env.example.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

// ── Tipos das tabelas ──────────────────────────────────────

export interface Client {
  id: string
  name: string
  contact: string | null
  email: string | null
  description: string | null
  created_at: string
  updated_at: string
  // relacionamentos carregados via join
  client_attachments?: ClientAttachment[]
  projects?: Project[]
}

export interface ClientAttachment {
  id: string
  client_id: string
  file_name: string
  file_url: string
  file_size: number | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  deadline: string | null
  value: number | null
  client_id: string | null
  status: 'ativo' | 'concluido' | 'pausado' | 'cancelado'
  created_at: string
  updated_at: string
  // relacionamentos
  clients?: Client
  project_members?: ProjectMember[]
  project_attachments?: ProjectAttachment[]
  kanban_columns?: KanbanColumn[]
}

export interface ProjectMember {
  id: string
  project_id: string
  name: string
  email: string | null
  created_at: string
}

export interface ProjectAttachment {
  id: string
  project_id: string
  file_name: string
  file_url: string
  file_size: number | null
  created_at: string
}

export interface KanbanColumn {
  id: string
  project_id: string
  name: string
  color: string
  position: number
  created_at: string
  // relacionamentos
  tasks?: Task[]
}

export interface Task {
  id: string
  project_id: string
  column_id: string | null
  title: string
  description: string | null
  deadline: string | null
  responsible: string | null
  manual_time_minutes: number
  timer_seconds: number
  status: 'pendente' | 'em_andamento' | 'concluida' | 'atrasada'
  position: number
  created_at: string
  updated_at: string
  // relacionamentos
  projects?: Project
  kanban_columns?: KanbanColumn
  task_todos?: TaskTodo[]
  task_attachments?: TaskAttachment[]
}

export interface TaskTimerSession {
  id: string
  task_id: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  created_at: string
}

export interface TaskAttachment {
  id: string
  task_id: string
  file_name: string
  file_url: string
  file_size: number | null
  created_at: string
}

export interface TaskTodo {
  id: string
  task_id: string
  title: string
  completed: boolean
  position: number
  created_at: string
}
