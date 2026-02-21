-- Security Advisor hardening
-- 1) Fix mutable search_path on SQL functions
-- 2) Move pgvector extension out of public schema when possible

create schema if not exists extensions;

do $$
begin
  if exists (
    select 1
    from pg_extension
    where extname = 'vector'
  ) then
    begin
      alter extension vector set schema extensions;
    exception
      when insufficient_privilege then
        raise notice 'Could not move extension "vector" to schema "extensions" due to privileges.';
      when undefined_object then
        null;
      when others then
        raise notice 'Could not move extension "vector" to schema "extensions": %', sqlerrm;
    end;
  else
    create extension if not exists vector with schema extensions;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'handle_new_user'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    alter function public.handle_new_user()
      set search_path = public;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'match_news_embedding'
      and pg_get_function_identity_arguments(p.oid) = 'query_embedding text, similarity_threshold double precision, match_count integer'
  ) then
    alter function public.match_news_embedding(text, double precision, integer)
      set search_path = public, extensions;
  end if;
end
$$;

