-- Run in Supabase SQL Editor: enforce 3 votes per email across all devices

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

  IF p_device_fingerprint IS NULL OR length(trim(p_device_fingerprint)) < 8 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid device fingerprint');
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_device_vote_count
  FROM votes
  WHERE device_fingerprint = p_device_fingerprint;

  SELECT * INTO v_voter FROM voters WHERE email = v_email;

  IF v_voter.id IS NULL THEN
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

GRANT EXECUTE ON FUNCTION sign_in_voter(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_vote(UUID, TEXT, INTEGER, TEXT, TEXT) TO anon, authenticated;
