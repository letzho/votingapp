-- Run AFTER allowed-emails.sql
-- Enforces: @mymail.nyp.edu.sg must be whitelisted, @nyp.edu.sg can sign in freely

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

GRANT EXECUTE ON FUNCTION sign_in_voter(TEXT, TEXT, TEXT) TO anon, authenticated;
