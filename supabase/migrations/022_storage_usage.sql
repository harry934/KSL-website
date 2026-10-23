-- Sum of files in Supabase Storage, for the portal storage meter.
-- The storage schema is not exposed on the API, so the portal calls this instead.

create or replace function public.storage_usage()
returns table (bucket_id text, bytes bigint, files bigint)
language sql
stable
security definer
set search_path = storage, public
as $$
  select
    bucket_id,
    coalesce(sum((metadata->>'size')::bigint), 0),
    count(*)::bigint
  from storage.objects
  group by bucket_id;
$$;

revoke all on function public.storage_usage() from public, anon, authenticated;
grant execute on function public.storage_usage() to service_role;
