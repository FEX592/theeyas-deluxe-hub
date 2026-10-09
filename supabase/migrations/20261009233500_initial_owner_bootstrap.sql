begin;

create or replace function private.assign_confirmed_user_role(
  target_user_id uuid,
  target_email text,
  user_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  invite_token text;
begin
  perform pg_advisory_xact_lock(483921);
  insert into public.profiles (id, email, display_name, role)
  values (target_user_id, target_email, nullif(user_metadata ->> 'display_name', ''), 'customer')
  on conflict (id) do update set email = excluded.email;
  invite_token := nullif(user_metadata ->> 'invite_token', '');
  if invite_token is not null then
    update public.admin_invites
    set accepted_by = target_user_id, accepted_at = now()
    where token = invite_token
      and accepted_at is null
      and expires_at > now()
      and (invited_email is null or lower(invited_email) = lower(target_email));
    if found then update public.profiles set role = 'admin' where id = target_user_id; end if;
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles where role = 'admin')
     and coalesce(new.raw_app_meta_data ->> 'tdh_bootstrap', 'false') <> 'true' then
    raise exception 'Public registration is temporarily closed while initial owner setup is pending';
  end if;
  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'display_name', ''), 'customer')
  on conflict (id) do nothing;
  if new.email_confirmed_at is not null then
    perform private.assign_confirmed_user_role(new.id, new.email, new.raw_user_meta_data);
  end if;
  return new;
end;
$$;

create or replace function public.bootstrap_initial_admin(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform pg_advisory_xact_lock(483921);
  if exists (select 1 from public.profiles where role = 'admin') then return false; end if;
  update public.profiles set role = 'admin' where id = p_user_id;
  if not found then raise exception 'Bootstrap user profile was not created'; end if;
  return true;
end;
$$;

revoke all on function public.bootstrap_initial_admin(uuid) from public, anon, authenticated;
grant execute on function public.bootstrap_initial_admin(uuid) to service_role;
revoke execute on function public.handle_new_user() from anon, authenticated;
commit;
