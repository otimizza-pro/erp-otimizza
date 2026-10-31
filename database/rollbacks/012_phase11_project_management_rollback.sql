-- Rollback 012: Fase 11 - Gestão de Projetos, Tarefas, Modelos e Recorrência Operacional

DROP TABLE IF EXISTS project_generation_history CASCADE;
DROP TABLE IF EXISTS contract_project_recurring_settings CASCADE;
DROP TABLE IF EXISTS project_time_entries CASCADE;
DROP TABLE IF EXISTS project_checklists CASCADE;
DROP TABLE IF EXISTS project_tasks CASCADE;
DROP TABLE IF EXISTS project_stages CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS project_template_tasks CASCADE;
DROP TABLE IF EXISTS project_template_stages CASCADE;
DROP TABLE IF EXISTS project_templates CASCADE;
DROP SEQUENCE IF EXISTS task_number_seq;
DROP SEQUENCE IF EXISTS project_number_seq;
