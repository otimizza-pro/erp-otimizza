-- 068_project_post_short_titles.sql
-- Padroniza os títulos das peças/posts vinculados a projetos no formato:
-- #numero + Nome do Cliente + | Formato - Headline

UPDATE public.content_calendar_items c
SET title = LEFT(
  '#' || LPAD(COALESCE(c.project_post_number, 1)::text, 2, '0') || ' ' ||
  COALESCE(NULLIF(btrim(COALESCE(NULLIF(cl.trade_name, ''), cl.name)), ''), 'Cliente') ||
  CASE WHEN NULLIF(btrim(c.format), '') IS NOT NULL THEN ' | ' || btrim(c.format) ELSE '' END ||
  CASE
    WHEN NULLIF(btrim(COALESCE(NULLIF(c.selected_headline, ''), c.central_idea)), '') IS NOT NULL
      THEN ' - ' || btrim(COALESCE(NULLIF(c.selected_headline, ''), c.central_idea))
    ELSE ''
  END,
  255
)
FROM public.clients cl
WHERE c.client_id = cl.id
  AND c.project_id IS NOT NULL
  AND c.archived_at IS NULL;
