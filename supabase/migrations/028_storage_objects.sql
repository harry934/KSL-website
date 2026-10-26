-- Individual storage objects, so the portal can tell attached files from the recycle bin.

create or replace function public.storage_objects()
returns table (bucket_id text, name text, bytes bigint)
language sql
stable
security definer
set search_path = storage, public
as $$
  select
    bucket_id,
    name,
    coalesce((metadata->>'size')::bigint, 0)
  from storage.objects;
$$;

revoke all on function public.storage_objects() from public, anon, authenticated;
grant execute on function public.storage_objects() to service_role;
