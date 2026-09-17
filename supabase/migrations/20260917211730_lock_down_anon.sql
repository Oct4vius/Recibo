-- La app siempre opera autenticada. anon no debe ver ni ejecutar nada en public.
-- Supabase concede por defecto privilegios a anon sobre tablas nuevas; los quitamos
-- para lo existente y para lo futuro (default privileges del rol que corre migraciones).
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;
