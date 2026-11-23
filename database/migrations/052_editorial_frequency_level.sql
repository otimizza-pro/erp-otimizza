-- Convert client_editorial_lines.frequency_per_month from integer to varchar/text ('Alta', 'Média', 'Baixa')

ALTER TABLE client_editorial_lines 
  ALTER COLUMN frequency_per_month TYPE VARCHAR(20) 
  USING (
    CASE 
      WHEN frequency_per_month::text IN ('Alta', 'Média', 'Baixa') THEN frequency_per_month::text
      WHEN frequency_per_month::text ~ '^[0-9]+$' AND frequency_per_month::integer >= 6 THEN 'Alta'
      WHEN frequency_per_month::text ~ '^[0-9]+$' AND frequency_per_month::integer <= 2 THEN 'Baixa'
      ELSE 'Média'
    END
  );

ALTER TABLE client_editorial_lines 
  ALTER COLUMN frequency_per_month SET DEFAULT 'Média';
