-- One identity can exist before a lead becomes a client. Conversion transfers
-- ownership to the client; lead access then resolves its converted_client_id.
ALTER TABLE client_identities ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE client_identities ADD COLUMN IF NOT EXISTS lead_id UUID UNIQUE REFERENCES crm_leads(id) ON DELETE CASCADE;
ALTER TABLE client_identities ADD COLUMN IF NOT EXISTS commercial_profile JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE client_identities ADD CONSTRAINT chk_identity_owner CHECK ((client_id IS NOT NULL)::int + (lead_id IS NOT NULL)::int = 1);
ALTER TABLE client_identities ADD CONSTRAINT chk_commercial_profile_object CHECK (jsonb_typeof(commercial_profile)='object');

CREATE OR REPLACE FUNCTION transfer_lead_commercial_dna() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE lead_dna client_identities%ROWTYPE; existing_id UUID;
BEGIN
 IF NEW.converted_client_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO lead_dna FROM client_identities WHERE lead_id=NEW.id FOR UPDATE;
 IF NOT FOUND THEN RETURN NEW; END IF;
 -- Serialize two leads being linked to the same client at once.
 PERFORM 1 FROM clients WHERE id=NEW.converted_client_id FOR UPDATE;
 SELECT id INTO existing_id FROM client_identities WHERE client_id=NEW.converted_client_id FOR UPDATE;
 IF existing_id IS NULL THEN
  UPDATE client_identities SET client_id=NEW.converted_client_id,lead_id=NULL,updated_at=NOW() WHERE id=lead_dna.id;
 ELSE
  -- Existing confirmed client data wins; missing fields inherit the lead DNA.
  UPDATE client_identities c SET
   brand_context=COALESCE(NULLIF(btrim(c.brand_context),''),lead_dna.brand_context),
   commercial_profile=lead_dna.commercial_profile || COALESCE((SELECT jsonb_object_agg(key,value) FROM jsonb_each(c.commercial_profile) WHERE value <> 'null'::jsonb AND value <> '""'::jsonb),'{}'::jsonb),
   updated_at=NOW()
  WHERE c.id=existing_id;
  DELETE FROM client_identities WHERE id=lead_dna.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER crm_lead_transfer_dna AFTER UPDATE OF converted_client_id ON crm_leads
FOR EACH ROW WHEN (NEW.converted_client_id IS NOT NULL) EXECUTE FUNCTION transfer_lead_commercial_dna();
