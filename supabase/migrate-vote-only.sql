-- Run in Supabase SQL Editor to switch to vote-only (no star rating)

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
    RETURN json_build_object('success', false, 'error', 'You have used all 3 votes.');
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_device_vote_count
  FROM votes WHERE device_fingerprint = p_device_fingerprint;
  IF v_device_vote_count >= 3 THEN
    RETURN json_build_object('success', false, 'error', 'This device has already used all 3 votes.');
  END IF;

  -- Vote only: stars column kept for compatibility, always stored as 1
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

GRANT EXECUTE ON FUNCTION submit_vote(UUID, TEXT, INTEGER, TEXT, TEXT) TO anon, authenticated;
GRANT SELECT ON group_vote_totals TO anon, authenticated;
