-- 057_project_active_timers.sql
-- Tabela para rastreamento de tempo ativo em projetos e tarefas (Time Tracker / Cronômetro)
-- Permite iniciar, pausar, retomar e finalizar apontamentos de esforço em tempo real.

CREATE TABLE IF NOT EXISTS public.project_active_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL DEFAULT '',
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accumulated_seconds INTEGER NOT NULL DEFAULT 0 CHECK (accumulated_seconds >= 0),
    is_running BOOLEAN NOT NULL DEFAULT true,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (hourly_rate >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_active_timers_project ON public.project_active_timers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_active_timers_task ON public.project_active_timers(task_id);

ALTER TABLE public.project_active_timers ENABLE ROW LEVEL SECURITY;

GRANT ALL PRIVILEGES ON TABLE public.project_active_timers TO postgres, service_role;
