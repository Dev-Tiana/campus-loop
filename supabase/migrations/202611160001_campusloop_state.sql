create table public.campusloop_state (
  id text primary key check (id = 'state'),
  revision integer not null default 0,
  state jsonb not null check (jsonb_typeof(state) = 'object')
);

alter table public.campusloop_state enable row level security;
revoke all on public.campusloop_state from public, anon, authenticated;
grant select, insert, update on public.campusloop_state to service_role;

insert into storage.buckets (id, name, public, file_size_limit)
values ('campusloop-media', 'campusloop-media', false, 26214400);
