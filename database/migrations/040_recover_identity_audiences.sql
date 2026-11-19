-- Recover audiences received through older briefing/DNA writers after 033.
-- Retain the original legacy column as history; application writers now use
-- client_audiences exclusively and reads already derive audiences from it.
INSERT INTO client_audiences(client_id,name,description)
SELECT i.client_id,left(btrim(a.value),255),btrim(a.value)
FROM client_identities i CROSS JOIN LATERAL unnest(i.target_audiences) a(value)
WHERE i.client_id IS NOT NULL AND btrim(a.value) <> ''
  AND NOT EXISTS (SELECT 1 FROM client_audiences c
    WHERE c.client_id=i.client_id AND lower(btrim(c.name))=lower(left(btrim(a.value),255)))
GROUP BY i.client_id,left(btrim(a.value),255),btrim(a.value);
