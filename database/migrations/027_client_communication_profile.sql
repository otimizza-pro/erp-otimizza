-- Separa a natureza de quem comunica, os públicos e a forma de apresentação.
-- Sem inferir perfil a partir de PF/PJ, B2B/B2C ou alterar cadastros existentes.
ALTER TABLE client_identities ADD COLUMN IF NOT EXISTS communication_profile JSONB NOT NULL DEFAULT '{"speakerTypes":[],"audienceTypes":[],"contentVoices":[],"details":""}'::jsonb;
ALTER TABLE client_identities ADD CONSTRAINT client_identity_communication_object CHECK(jsonb_typeof(communication_profile)='object');
