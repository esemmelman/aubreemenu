create table public.aubreemenu_items_v1 (
 id uuid primary key default gen_random_uuid(),
 subject text not null check(subject in ('Spanish','English','Physical Sciences','U.S. History','Culinary')),
 name text not null check(length(trim(name)) between 1 and 160),
 url text not null check(length(url)<=2048 and url ~ '^https?://[^[:space:]]+$'),
 created_at timestamptz not null default now()
);
create index aubreemenu_items_subject_name on public.aubreemenu_items_v1(subject,name);
alter table public.aubreemenu_items_v1 enable row level security;
revoke all on public.aubreemenu_items_v1 from anon, authenticated;
grant all on public.aubreemenu_items_v1 to service_role;
create table public.aubreemenu_admin_v1 (
 id integer primary key check(id=1), salt text not null, hash text not null
);
alter table public.aubreemenu_admin_v1 enable row level security;
revoke all on public.aubreemenu_admin_v1 from anon, authenticated;
grant all on public.aubreemenu_admin_v1 to service_role;
create table public.aubreemenu_attempts_v1 (
 key text primary key, attempts integer not null, started_at timestamptz not null
);
alter table public.aubreemenu_attempts_v1 enable row level security;
revoke all on public.aubreemenu_attempts_v1 from anon, authenticated;
grant all on public.aubreemenu_attempts_v1 to service_role;
create function public.aubreemenu_check_rate_v1(p_key text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
 delete from public.aubreemenu_attempts_v1 where started_at < now()-interval '15 minutes';
 insert into public.aubreemenu_attempts_v1(key,attempts,started_at) values(p_key,1,now())
 on conflict(key) do update set attempts=public.aubreemenu_attempts_v1.attempts+1
 returning attempts into n;
 return n<=30;
end; $$;
revoke all on function public.aubreemenu_check_rate_v1(text) from public,anon,authenticated;
grant execute on function public.aubreemenu_check_rate_v1(text) to service_role;
