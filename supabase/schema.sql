-- Engineering Exploration Project Voting App Schema
-- Run this in Supabase SQL Editor

-- Groups (student teams / booths)
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  booth_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Voters (email sign-in sessions)
CREATE TABLE IF NOT EXISTS voters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  device_fingerprint TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Whitelist for student emails (@mymail.nyp.edu.sg only)
CREATE TABLE IF NOT EXISTS allowed_student_emails (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual votes (max 3 per voter, max 3 per device fingerprint)
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  ip_address TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_votes_voter_id ON votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_votes_group_id ON votes(group_id);
CREATE INDEX IF NOT EXISTS idx_votes_device_fingerprint ON votes(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_voters_device_fingerprint ON voters(device_fingerprint);

-- Aggregate view for leaderboard (ranked by vote count)
CREATE OR REPLACE VIEW group_vote_totals AS
SELECT
  g.id,
  g.name,
  g.slug,
  g.booth_number,
  COUNT(v.id)::INTEGER AS vote_count
FROM groups g
LEFT JOIN votes v ON v.group_id = g.id
GROUP BY g.id, g.name, g.slug, g.booth_number
ORDER BY vote_count DESC, g.name ASC;

-- Validate NYP email domain
CREATE OR REPLACE FUNCTION is_valid_nyp_email(email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(email)) LIKE '%@mymail.nyp.edu.sg'
      OR lower(trim(email)) LIKE '%@nyp.edu.sg';
$$;

-- Sign in or register voter (records IP + device fingerprint)
CREATE OR REPLACE FUNCTION sign_in_voter(
  p_email TEXT,
  p_device_fingerprint TEXT,
  p_ip_address TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_voter voters%ROWTYPE;
  v_device_vote_count INTEGER;
  v_vote_count INTEGER;
BEGIN
  IF NOT is_valid_nyp_email(v_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Email must end with @mymail.nyp.edu.sg or @nyp.edu.sg'
    );
  END IF;

  -- Student emails must be on the approved list
  IF v_email LIKE '%@mymail.nyp.edu.sg' THEN
    IF NOT EXISTS (SELECT 1 FROM allowed_student_emails WHERE email = v_email) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'This student email is not registered for voting. Please contact the event organiser.'
      );
    END IF;
  END IF;

  IF p_device_fingerprint IS NULL OR length(trim(p_device_fingerprint)) < 8 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid device fingerprint');
  END IF;

  -- Block same device from using multiple emails once it has used all 3 votes
  SELECT COUNT(*)::INTEGER INTO v_device_vote_count
  FROM votes
  WHERE device_fingerprint = p_device_fingerprint;

  SELECT * INTO v_voter FROM voters WHERE email = v_email;

  IF v_voter.id IS NULL THEN
    -- New email: check if this device already voted 3 times under another email
    IF v_device_vote_count >= 3 THEN
      RETURN json_build_object(
        'success', false,
        'error', 'This device has already used all 3 votes. Multiple accounts on the same device are not allowed.'
      );
    END IF;

    INSERT INTO voters (email, device_fingerprint, ip_address, last_login_at)
    VALUES (v_email, p_device_fingerprint, p_ip_address, now())
    RETURNING * INTO v_voter;
  ELSE
    -- Existing email: update login info
  UPDATE voters
    SET last_login_at = now(),
        ip_address = COALESCE(p_ip_address, ip_address),
        device_fingerprint = p_device_fingerprint
    WHERE id = v_voter.id
    RETURNING * INTO v_voter;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_vote_count FROM votes WHERE voter_id = v_voter.id;

  RETURN json_build_object(
    'success', true,
    'voter_id', v_voter.id,
    'email', v_voter.email,
    'votes_used', v_vote_count,
    'votes_remaining', GREATEST(0, 3 - v_vote_count),
    'votes_complete', v_vote_count >= 3,
    'message', CASE
      WHEN v_vote_count >= 3 THEN 'You have already completed all 3 votes with this email account.'
      ELSE NULL
    END
  );
END;
$$;

-- Submit a vote with server-side validation
CREATE OR REPLACE FUNCTION submit_vote(
  p_voter_id UUID,
  p_group_slug TEXT,
  p_stars INTEGER,
  p_ip_address TEXT,
  p_device_fingerprint TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voter_row voters%ROWTYPE;
  v_group groups%ROWTYPE;
  v_vote_count INTEGER;
  v_device_vote_count INTEGER;
BEGIN
  SELECT * INTO v_voter_row FROM voters WHERE id = p_voter_id;
  IF v_voter_row.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Voter not found. Please sign in again.');
  END IF;

  IF v_voter_row.device_fingerprint <> p_device_fingerprint THEN
    RETURN json_build_object('success', false, 'error', 'Device mismatch. Please sign in again.');
  END IF;

  SELECT * INTO v_group FROM groups WHERE slug = lower(trim(p_group_slug));
  IF v_group.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Group not found. Please scan a valid booth QR code.');
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_vote_count FROM votes WHERE voter_id = p_voter_id;
  IF v_vote_count >= 3 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You have already completed all 3 votes with this email account. You cannot vote again, even on a different device.'
    );
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_device_vote_count
  FROM votes WHERE device_fingerprint = p_device_fingerprint;
  IF v_device_vote_count >= 3 THEN
    RETURN json_build_object('success', false, 'error', 'This device has already used all 3 votes.');
  END IF;

  INSERT INTO votes (voter_id, group_id, stars, ip_address, device_fingerprint)
  VALUES (p_voter_id, v_group.id, 1, COALESCE(p_ip_address, 'unknown'), p_device_fingerprint);

  v_vote_count := v_vote_count + 1;

  RETURN json_build_object(
    'success', true,
    'group_name', v_group.name,
    'votes_used', v_vote_count,
    'votes_remaining', GREATEST(0, 3 - v_vote_count)
  );
END;
$$;

-- Get voter session status
CREATE OR REPLACE FUNCTION get_voter_status(p_voter_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voter voters%ROWTYPE;
  v_vote_count INTEGER;
BEGIN
  SELECT * INTO v_voter FROM voters WHERE id = p_voter_id;
  IF v_voter.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Voter not found');
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_vote_count FROM votes WHERE voter_id = p_voter_id;

  RETURN json_build_object(
    'success', true,
    'voter_id', v_voter.id,
    'email', v_voter.email,
    'votes_used', v_vote_count,
    'votes_remaining', GREATEST(0, 3 - v_vote_count)
  );
END;
$$;

-- Seed example groups (customize or delete and add your own)
INSERT INTO groups (name, slug, booth_number) VALUES
  ('Team Alpha', 'team-alpha', 'A1'),
  ('Team Beta', 'team-beta', 'A2'),
  ('Team Gamma', 'team-gamma', 'B1')
ON CONFLICT (slug) DO NOTHING;

-- Row Level Security
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_student_emails ENABLE ROW LEVEL SECURITY;

-- Public read for groups and leaderboard
CREATE POLICY "Anyone can read groups"
  ON groups FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read vote totals via view"
  ON votes FOR SELECT
  USING (true);

-- Voters: no direct client access (use RPC functions)
CREATE POLICY "No direct voter access"
  ON voters FOR ALL
  USING (false);

CREATE POLICY "No direct allowed email access"
  ON allowed_student_emails FOR ALL
  USING (false);

-- Votes: insert only via RPC (no direct insert policy for anon)
CREATE POLICY "No direct vote insert"
  ON votes FOR INSERT
  WITH CHECK (false);

-- Grant execute on functions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION sign_in_voter(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_vote(UUID, TEXT, INTEGER, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_voter_status(UUID) TO anon, authenticated;
GRANT SELECT ON group_vote_totals TO anon, authenticated;
