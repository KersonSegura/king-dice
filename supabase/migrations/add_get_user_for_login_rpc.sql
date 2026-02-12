-- Returns one user row by username or email. Uses row_to_json so we never reference column names;
-- works whether your table has passwordHash, password_hash, isAdmin, is_admin, etc.
CREATE OR REPLACE FUNCTION public.get_user_for_login(p_identifier text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identifier text := trim(lower(p_identifier));
  v_row json;
BEGIN
  SELECT row_to_json(u) INTO v_row
  FROM public.users u
  WHERE lower(trim(u.username)) = v_identifier
     OR lower(trim(u.email)) = v_identifier
  LIMIT 1;
  RETURN v_row;
END;
$$;

-- Allow service role and anon to call (API uses service role for login)
GRANT EXECUTE ON FUNCTION public.get_user_for_login(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_for_login(text) TO anon;

COMMENT ON FUNCTION public.get_user_for_login(text) IS 'Returns one user row by username or email for login; uses public.users.passwordHash.';
