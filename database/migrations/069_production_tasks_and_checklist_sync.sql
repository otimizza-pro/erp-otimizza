-- 069_production_tasks_and_checklist_sync.sql
-- Cria a tabela de Tarefas de Produção vinculadas opcionalmente a clientes, projetos,
-- tarefas de projeto e itens de checklist, com garantia de no máximo 1 tarefa ativa por checklist.

CREATE TABLE IF NOT EXISTS public.production_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  project_task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  checklist_item_id UUID REFERENCES public.project_checklists(id) ON DELETE SET NULL,
  task_type VARCHAR(40) NOT NULL DEFAULT 'OTHER',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  reschedule_count INTEGER NOT NULL DEFAULT 0,
  reschedule_reason TEXT,
  reschedule_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_production_tasks_active_checklist
  ON public.production_tasks (checklist_item_id)
  WHERE checklist_item_id IS NOT NULL
    AND archived_at IS NULL
    AND status IN ('PENDING', 'RESCHEDULED');

CREATE INDEX IF NOT EXISTS idx_production_tasks_status_due
  ON public.production_tasks (status, due_date);

CREATE INDEX IF NOT EXISTS idx_production_tasks_client
  ON public.production_tasks (client_id);

CREATE INDEX IF NOT EXISTS idx_production_tasks_project
  ON public.production_tasks (project_id);

CREATE INDEX IF NOT EXISTS idx_production_tasks_checklist
  ON public.production_tasks (checklist_item_id);

ALTER TABLE public.production_tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.production_tasks FROM anon, authenticated;
GRANT ALL ON TABLE public.production_tasks TO postgres, service_role;
