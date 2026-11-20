CREATE TABLE public.project_social_media_plans (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  posts_per_month INTEGER NOT NULL CHECK (posts_per_month BETWEEN 1 AND 31),
  weekdays INTEGER[] NOT NULL CHECK (
    cardinality(weekdays) BETWEEN 1 AND 7
    AND weekdays <@ ARRAY[0, 1, 2, 3, 4, 5, 6]
  )
);

CREATE TABLE public.project_social_media_months (
  project_id UUID NOT NULL REFERENCES public.project_social_media_plans(project_id) ON DELETE CASCADE,
  month DATE NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),
  PRIMARY KEY (project_id, month)
);

ALTER TABLE public.content_calendar_items
  ADD COLUMN project_id UUID,
  ADD COLUMN project_month DATE,
  ADD COLUMN project_post_number INTEGER,
  ADD CONSTRAINT content_calendar_project_month_fk
    FOREIGN KEY (project_id, project_month)
    REFERENCES public.project_social_media_months(project_id, month)
    MATCH FULL,
  ADD CONSTRAINT content_calendar_project_post_number_check
    CHECK ((project_id IS NULL AND project_post_number IS NULL) OR
           (project_id IS NOT NULL AND project_post_number IS NOT NULL AND project_post_number > 0)),
  ADD CONSTRAINT content_calendar_project_post_unique
    UNIQUE (project_id, project_month, project_post_number);

ALTER TABLE public.project_social_media_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_social_media_months ENABLE ROW LEVEL SECURITY;

