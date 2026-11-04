CREATE TABLE client_activity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category VARCHAR(30) NOT NULL,
  action VARCHAR(30) NOT NULL,
  title TEXT NOT NULL,
  href TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_client_activity_history_client_date ON client_activity_history(client_id,created_at DESC);
ALTER TABLE client_activity_history ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION record_client_activity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cid UUID; label TEXT; target TEXT; category_name TEXT;
BEGIN
  IF TG_TABLE_NAME='projects' THEN
    cid=NEW.client_id; label=NEW.name; target='/projects/'||NEW.id; category_name='Projetos';
  ELSIF TG_TABLE_NAME='project_tasks' THEN
    SELECT client_id INTO cid FROM projects WHERE id=NEW.project_id;
    label=NEW.title; target='/projects/'||NEW.project_id; category_name='Projetos';
  ELSIF TG_TABLE_NAME='receivables' THEN
    cid=NEW.client_id; label=NEW.receivable_number||' — '||NEW.description; target='/financial/receivables/'||NEW.id; category_name='Financeiro';
  ELSIF TG_TABLE_NAME='client_document_folders' THEN
    cid=NEW.client_id; label='Pasta: '||NEW.name; target='/clients/'||cid; category_name='Documentos';
  ELSIF TG_TABLE_NAME='client_document_placements' THEN
    cid=NEW.client_id; SELECT title INTO label FROM documents WHERE id=NEW.document_id;
    target='/api/documents/'||NEW.document_id||'/download'; category_name='Documentos';
  END IF;
  IF cid IS NOT NULL THEN
    INSERT INTO client_activity_history(client_id,category,action,title,href,old_data,new_data)
    VALUES(cid,category_name,CASE WHEN TG_OP='INSERT' THEN 'Criado' ELSE 'Atualizado' END,label,target,CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER projects_client_history AFTER UPDATE ON projects FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION record_client_activity();
CREATE TRIGGER tasks_client_history AFTER UPDATE ON project_tasks FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION record_client_activity();
CREATE TRIGGER receivables_client_history AFTER UPDATE ON receivables FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION record_client_activity();
CREATE TRIGGER folders_client_history AFTER INSERT OR UPDATE ON client_document_folders FOR EACH ROW EXECUTE FUNCTION record_client_activity();
CREATE TRIGGER placements_client_history AFTER INSERT OR UPDATE ON client_document_placements FOR EACH ROW EXECUTE FUNCTION record_client_activity();
