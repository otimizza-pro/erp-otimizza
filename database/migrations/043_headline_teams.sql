CREATE TABLE headline_workspaces (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES clients(id), user_id text NOT NULL,
 content_id uuid NOT NULL UNIQUE REFERENCES content_calendar_items(id) ON DELETE CASCADE,
 brief jsonb NOT NULL DEFAULT '{}', brainstorm jsonb NOT NULL DEFAULT '[]',
 revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE headline_style_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),client_id uuid NOT NULL REFERENCES clients(id),user_id text NOT NULL,format text NOT NULL,
 guidance text NOT NULL DEFAULT '', version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(client_id,user_id,format)
);
CREATE TABLE headline_rounds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES headline_workspaces(id) ON DELETE CASCADE,
 brief jsonb NOT NULL,prompt text NOT NULL,context jsonb NOT NULL,style jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE headline_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),round_id uuid NOT NULL REFERENCES headline_rounds(id) ON DELETE CASCADE,
 team text NOT NULL CHECK(team IN ('A','B')),slot integer NOT NULL CHECK(slot BETWEEN 1 AND 4),
 mode text NOT NULL CHECK(mode IN ('PROMPT','STYLE')),attempt integer NOT NULL DEFAULT 1,
 requested_model text NOT NULL,actual_model text,status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','RUNNING','SUCCESS','ERROR')),
 rejection_snapshot jsonb NOT NULL DEFAULT '[]', style_snapshot jsonb, usage jsonb,error text,
 started_at timestamptz,finished_at timestamptz,duration_ms integer,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(round_id,team,slot,mode,attempt)
);
CREATE TABLE headline_candidates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),round_id uuid NOT NULL REFERENCES headline_rounds(id) ON DELETE CASCADE,
 run_id uuid REFERENCES headline_runs(id),headline text NOT NULL CHECK(length(btrim(headline))>0),subheadline text NOT NULL DEFAULT '',
 metadata jsonb NOT NULL DEFAULT '{}',source text NOT NULL DEFAULT 'AI' CHECK(source IN ('AI','HUMAN')),
 rating integer NOT NULL DEFAULT 0 CHECK(rating BETWEEN -1 AND 1),reason text NOT NULL DEFAULT '',
 inspired_by uuid[] NOT NULL DEFAULT '{}',presented_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX headline_runs_round ON headline_runs(round_id);
CREATE INDEX headline_candidates_round ON headline_candidates(round_id);
CREATE INDEX headline_workspace_scope ON headline_workspaces(client_id,user_id,updated_at DESC);
CREATE TABLE headline_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),candidate_id uuid NOT NULL REFERENCES headline_candidates(id),
 user_id text NOT NULL,action text NOT NULL CHECK(action IN ('RATING','SELECT','CREATE_HUMAN')),data jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE headline_measurements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),candidate_id uuid NOT NULL REFERENCES headline_candidates(id),
 content_id uuid NOT NULL REFERENCES content_calendar_items(id),date_from date NOT NULL,date_to date NOT NULL CHECK(date_to>=date_from),
 impressions integer NOT NULL CHECK(impressions>=0),clicks integer NOT NULL CHECK(clicks>=0),leads integer NOT NULL CHECK(leads>=0),
 sales integer NOT NULL CHECK(sales>=0),spend numeric(14,2) NOT NULL CHECK(spend>=0),currency text NOT NULL DEFAULT 'BRL' CHECK(currency='BRL'),
 source text NOT NULL CHECK(length(btrim(source))>0),created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(clicks<=impressions),UNIQUE(content_id,date_from,date_to)
);
CREATE TABLE headline_experiments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL REFERENCES headline_workspaces(id),
 candidate_a uuid NOT NULL REFERENCES headline_candidates(id),candidate_b uuid NOT NULL REFERENCES headline_candidates(id),
 hypothesis text NOT NULL,variable text NOT NULL,controls text NOT NULL,metric text NOT NULL,
 status text NOT NULL DEFAULT 'PLANNED' CHECK(status IN ('PLANNED','RUNNING','COMPLETED')),
 conclusion text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),CHECK(candidate_a<>candidate_b)
);
ALTER TABLE content_calendar_items ADD COLUMN headline_candidate_id uuid REFERENCES headline_candidates(id) ON DELETE SET NULL;
ALTER TABLE content_calendar_items ADD COLUMN selected_subheadline text NOT NULL DEFAULT '';
ALTER TABLE content_calendar_items ADD COLUMN headline_brief jsonb;
ALTER TABLE content_calendar_items ADD COLUMN headline_content_stale boolean NOT NULL DEFAULT false;
ALTER TABLE headline_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE headline_style_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE headline_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE headline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE headline_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE headline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE headline_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE headline_experiments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON headline_workspaces,headline_style_profiles,headline_rounds,headline_runs,headline_candidates,headline_events,headline_measurements,headline_experiments FROM anon,authenticated;
