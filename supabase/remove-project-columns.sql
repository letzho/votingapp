-- Run this ONLY if you previously added a custom project_no column yourself.
-- The default app schema does NOT have a project column.

ALTER TABLE groups DROP COLUMN IF EXISTS project_no;
ALTER TABLE groups DROP COLUMN IF EXISTS project_number;
ALTER TABLE groups DROP COLUMN IF EXISTS project_title;
