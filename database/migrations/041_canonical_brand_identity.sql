-- DNA and content settings share one brand identity. Keep preset values as history.
INSERT INTO client_identities(client_id,brand_context,tone_of_voice,default_ctas,forbidden_words)
SELECT client_id,brand_context,default_tones,default_ctas,forbidden_words FROM client_brand_voice_presets
ON CONFLICT(client_id) DO UPDATE SET
 brand_context=COALESCE(NULLIF(btrim(client_identities.brand_context),''),EXCLUDED.brand_context),
 tone_of_voice=CASE WHEN cardinality(client_identities.tone_of_voice)=0 THEN EXCLUDED.tone_of_voice ELSE client_identities.tone_of_voice END,
 default_ctas=CASE WHEN cardinality(client_identities.default_ctas)=0 THEN EXCLUDED.default_ctas ELSE client_identities.default_ctas END,
 forbidden_words=CASE WHEN cardinality(client_identities.forbidden_words)=0 THEN EXCLUDED.forbidden_words ELSE client_identities.forbidden_words END,
 updated_at=NOW();
