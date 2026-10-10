-- Expire abandoned email signups five minutes after their latest confirmation email.
-- The first administrator is assigned only after a user confirms their email.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

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
  values (
    target_user_id,
    target_email,
    nullif(user_metadata ->> 'display_name', ''),
    'customer'
  )
  on conflict (id) do update set email = excluded.email;

  invite_token := nullif(user_metadata ->> 'invite_token', '');
  if invite_token is not null then
    update public.admin_invites
    set accepted_by = target_user_id, accepted_at = now()
    where token = invite_token
      and accepted_at is null
      and expires_at > now()
      and (invited_email is null or lower(invited_email) = lower(target_email));

    if found then
      update public.profiles set role = 'admin' where id = target_user_id;
      return;
    end if;
  end if;

  if not exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = 'admin'
      and u.email_confirmed_at is not null
      and u.id <> target_user_id
  ) then
    update public.profiles set role = 'admin' where id = target_user_id;
  end if;
end;
$$;

revoke all on function private.assign_confirmed_user_role(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'display_name', ''), 'customer')
  on conflict (id) do nothing;

  if new.email_confirmed_at is not null then
    perform private.assign_confirmed_user_role(new.id, new.email, new.raw_user_meta_data);
  end if;

  return new;
end;
$$;

create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform private.assign_confirmed_user_role(new.id, new.email, new.raw_user_meta_data);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute procedure public.handle_user_email_confirmed();

create or replace function public.registration_status()
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
  select jsonb_build_object(
    'first_admin_needed', not exists (
      select 1
      from public.profiles p
      join auth.users u on u.id = p.id
      where p.role = 'admin' and u.email_confirmed_at is not null
    )
  );
$$;

create or replace function private.cleanup_unconfirmed_email_signups()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
declare
  removed integer;
begin
  delete from auth.users u
  where u.email is not null
    and u.email_confirmed_at is null
    and u.raw_app_meta_data ->> 'provider' = 'email'
    and coalesce(u.confirmation_sent_at, u.created_at) <= now() - interval '5 minutes';

  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function private.cleanup_unconfirmed_email_signups() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid)
from cron.job
where jobname = 'cleanup-unverified-signups';

select cron.schedule(
  'cleanup-unverified-signups',
  '* * * * *',
  'select private.cleanup_unconfirmed_email_signups()'
);

commit;
