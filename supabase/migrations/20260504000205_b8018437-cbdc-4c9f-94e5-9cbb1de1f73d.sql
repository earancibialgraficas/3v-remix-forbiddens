REVOKE ALL ON FUNCTION public.send_system_admin_message(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_system_admin_message(text, text, text) TO authenticated;