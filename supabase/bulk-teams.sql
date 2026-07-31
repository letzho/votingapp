-- Teams table has NO project field.
-- Columns: id, name, slug, booth_number, created_at
--
-- QR codes must encode: https://YOUR-APP/vote?group=<slug>
-- The slug must match groups.slug exactly.

-- Optional: remove all teams (votes for those teams are deleted too)
-- DELETE FROM groups;

-- Optional: remove only sample seed teams
-- DELETE FROM groups WHERE slug IN ('team-alpha', 'team-beta', 'team-gamma');

-- Bulk insert many teams in ONE query (fast for 200 teams)
INSERT INTO groups (name, slug, booth_number) VALUES
  ('Team 001', 'team-001', 'B01'),
  ('Team 002', 'team-002', 'B02'),
  ('Team 003', 'team-003', 'B03')
  -- add more rows here...
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  booth_number = EXCLUDED.booth_number;

-- Check result
SELECT COUNT(*) AS team_count FROM groups;
SELECT name, slug, booth_number FROM groups ORDER BY name LIMIT 20;
