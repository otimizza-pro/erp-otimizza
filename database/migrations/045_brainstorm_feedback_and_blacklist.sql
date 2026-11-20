-- Migration 045: Brainstorm Feedback and Blacklist
ALTER TABLE content_brainstorm_ideas DROP CONSTRAINT IF EXISTS content_brainstorm_ideas_status_check;
ALTER TABLE content_brainstorm_ideas ADD CONSTRAINT content_brainstorm_ideas_status_check 
  CHECK(status IN ('IDEA', 'SAVED_FOR_LATER', 'REJECTED', 'HEADLINES_IN_PROGRESS', 'HEADLINE_CHOSEN', 'IN_CREATION', 'DONE', 'ARCHIVED'));

ALTER TABLE content_brainstorm_ideas ADD COLUMN IF NOT EXISTS rejection_reason text DEFAULT '';
