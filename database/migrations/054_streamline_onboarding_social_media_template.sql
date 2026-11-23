-- 054_streamline_onboarding_social_media_template.sql
-- Enxuga o template de Onboarding de Social Media (ONB-SOCIAL) para cobrir exclusivamente
-- as etapas de recepção, coleta de acessos, alinhamento estratégico e criação do calendário editorial.
-- A produção de peças, legendas, aprovação e publicação pertencem aos templates de entrega recorrente (DEL-SOCIAL-GRAV / DEL-SOCIAL-SEMGRAV).

DO $$
DECLARE
  tid UUID;
  st1_id UUID;
  st2_id UUID;
BEGIN
  SELECT id INTO tid FROM project_templates WHERE code = 'ONB-SOCIAL' LIMIT 1;

  IF tid IS NOT NULL THEN
    -- 1. Atualiza dados gerais do template (10 dias de prazo, 5h estimadas)
    UPDATE project_templates
    SET 
      name = 'Onboarding — Social Media',
      description = 'Etapas de alinhamento inicial, coleta de briefing e acessos, definição estratégica e criação do primeiro calendário editorial.',
      estimated_days = 10,
      estimated_hours = 5,
      updated_at = NOW()
    WHERE id = tid;

    -- 2. Remove tarefas de produção e publicação recorrente que não pertencem ao onboarding
    DELETE FROM project_template_tasks
    WHERE template_id = tid
      AND (
        title ILIKE '%produzir peças%'
        OR title ILIKE '%obter aprovação%'
        OR title ILIKE '%agendar publicações%'
        OR title ILIKE '%acompanhar interações%'
        OR title ILIKE '%apresentar relatório%'
      );

    -- 3. Remove etapas que ficaram vazias
    DELETE FROM project_template_stages
    WHERE template_id = tid
      AND id NOT IN (SELECT DISTINCT stage_id FROM project_template_tasks WHERE template_id = tid);

    -- 4. Reorganiza e renomeia as etapas restantes
    -- Etapa 1: Briefing & Acessos
    SELECT id INTO st1_id FROM project_template_stages WHERE template_id = tid ORDER BY order_index ASC LIMIT 1;
    IF st1_id IS NOT NULL THEN
      UPDATE project_template_stages SET name = 'Briefing & Acessos', order_index = 1 WHERE id = st1_id;
    END IF;

    -- Etapa 2: Estratégia & Calendário
    SELECT id INTO st2_id FROM project_template_stages WHERE template_id = tid AND id != st1_id ORDER BY order_index ASC LIMIT 1;
    IF st2_id IS NOT NULL THEN
      UPDATE project_template_stages SET name = 'Estratégia & Calendário', order_index = 2 WHERE id = st2_id;
    END IF;

  END IF;
END $$;
