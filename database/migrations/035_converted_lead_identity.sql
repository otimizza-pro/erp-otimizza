-- Shared identity stays synchronized while acquisition and qualification remain on the lead.
-- Explicit client links only: never infer identity by name or phone.
-- Multiple historical leads may share one client identity after conversion.
-- Keep document uniqueness for prospects that have not been converted.
DROP INDEX IF EXISTS uq_crm_leads_document;
CREATE UNIQUE INDEX uq_crm_leads_document ON crm_leads(document)
WHERE document IS NOT NULL AND document <> '' AND status NOT IN ('ARCHIVED', 'CONVERTED') AND converted_client_id IS NULL;

CREATE OR REPLACE FUNCTION prepare_converted_lead_identity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked clients%ROWTYPE;
BEGIN
 IF NEW.converted_client_id IS NOT NULL THEN
  NEW.status := 'CONVERTED';
  NEW.converted_at := COALESCE(NEW.converted_at, NOW());
  IF TG_OP = 'INSERT' OR NEW.converted_client_id IS DISTINCT FROM OLD.converted_client_id THEN
   SELECT * INTO STRICT linked FROM clients WHERE id = NEW.converted_client_id;
   NEW.person_type := linked.type;
   NEW.name := linked.name;
   NEW.trade_name := linked.trade_name;
   NEW.document := linked.document;
   NEW.email := linked.email;
   NEW.phone := linked.phone;
   NEW.whatsapp := linked.whatsapp;
   NEW.city := linked.city;
   NEW.state := linked.state;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER crm_converted_identity_prepare BEFORE INSERT OR UPDATE ON crm_leads
FOR EACH ROW EXECUTE FUNCTION prepare_converted_lead_identity();

CREATE OR REPLACE FUNCTION sync_converted_lead_to_client() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 -- Client-originated updates already contain the canonical identity.
 IF pg_trigger_depth() > 1 OR NEW.converted_client_id IS NULL THEN RETURN NEW; END IF;
 IF NEW.converted_client_id IS DISTINCT FROM OLD.converted_client_id THEN RETURN NEW; END IF;
 IF NEW.person_type IS DISTINCT FROM OLD.person_type OR NEW.name IS DISTINCT FROM OLD.name OR NEW.trade_name IS DISTINCT FROM OLD.trade_name OR NEW.document IS DISTINCT FROM OLD.document OR NEW.email IS DISTINCT FROM OLD.email OR NEW.phone IS DISTINCT FROM OLD.phone OR NEW.whatsapp IS DISTINCT FROM OLD.whatsapp OR NEW.city IS DISTINCT FROM OLD.city OR NEW.state IS DISTINCT FROM OLD.state THEN
  UPDATE clients c SET
   type = CASE WHEN NEW.person_type IS DISTINCT FROM OLD.person_type THEN NEW.person_type ELSE c.type END,
   name = CASE WHEN NEW.name IS DISTINCT FROM OLD.name THEN NEW.name ELSE c.name END,
   trade_name = CASE WHEN NEW.trade_name IS DISTINCT FROM OLD.trade_name THEN NEW.trade_name ELSE c.trade_name END,
   document = CASE WHEN NEW.document IS DISTINCT FROM OLD.document THEN NEW.document ELSE c.document END,
   email = CASE WHEN NEW.email IS DISTINCT FROM OLD.email THEN NEW.email ELSE c.email END,
   phone = CASE WHEN NEW.phone IS DISTINCT FROM OLD.phone THEN NEW.phone ELSE c.phone END,
   whatsapp = CASE WHEN NEW.whatsapp IS DISTINCT FROM OLD.whatsapp THEN NEW.whatsapp ELSE c.whatsapp END,
   city = CASE WHEN NEW.city IS DISTINCT FROM OLD.city THEN NEW.city ELSE c.city END,
   state = CASE WHEN NEW.state IS DISTINCT FROM OLD.state THEN NEW.state ELSE c.state END,
   updated_at = NOW()
  WHERE c.id = NEW.converted_client_id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER crm_converted_identity_to_client AFTER UPDATE ON crm_leads
FOR EACH ROW EXECUTE FUNCTION sync_converted_lead_to_client();

CREATE OR REPLACE FUNCTION sync_client_to_converted_leads() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.type IS DISTINCT FROM OLD.type OR NEW.name IS DISTINCT FROM OLD.name OR NEW.trade_name IS DISTINCT FROM OLD.trade_name OR NEW.document IS DISTINCT FROM OLD.document OR NEW.email IS DISTINCT FROM OLD.email OR NEW.phone IS DISTINCT FROM OLD.phone OR NEW.whatsapp IS DISTINCT FROM OLD.whatsapp OR NEW.city IS DISTINCT FROM OLD.city OR NEW.state IS DISTINCT FROM OLD.state THEN
  UPDATE crm_leads l SET
   person_type = NEW.type,
   name = NEW.name,
   trade_name = NEW.trade_name,
   document = NEW.document,
   email = NEW.email,
   phone = NEW.phone,
   whatsapp = NEW.whatsapp,
   city = NEW.city,
   state = NEW.state,
   updated_at = NOW()
  WHERE l.converted_client_id = NEW.id
   AND ROW(l.person_type, l.name, l.trade_name, l.document, l.email, l.phone, l.whatsapp, l.city, l.state) IS DISTINCT FROM ROW(NEW.type, NEW.name, NEW.trade_name, NEW.document, NEW.email, NEW.phone, NEW.whatsapp, NEW.city, NEW.state);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER clients_identity_to_converted_leads AFTER UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION sync_client_to_converted_leads();

CREATE INDEX IF NOT EXISTS idx_crm_leads_converted_client ON crm_leads(converted_client_id) WHERE converted_client_id IS NOT NULL;
-- Repair already linked records, taking the client identity as authoritative.
UPDATE crm_leads l SET
 person_type = c.type,
 name = c.name,
 trade_name = c.trade_name,
 document = c.document,
 email = c.email,
 phone = c.phone,
 whatsapp = c.whatsapp,
 city = c.city,
 state = c.state,
 status = 'CONVERTED', converted_at = COALESCE(l.converted_at, l.updated_at), updated_at = NOW()
FROM clients c WHERE c.id = l.converted_client_id;
