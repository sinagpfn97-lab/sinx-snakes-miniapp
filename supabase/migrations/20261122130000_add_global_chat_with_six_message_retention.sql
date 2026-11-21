create table if not exists public.global_chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_username text not null,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists global_chat_messages_created_idx
  on public.global_chat_messages(created_at desc, id desc);

alter table public.global_chat_messages enable row level security;

drop policy if exists "registered users can read global chat" on public.global_chat_messages;
create policy "registered users can read global chat"
  on public.global_chat_messages for select to authenticated
  using (true);

revoke insert, update, delete on public.global_chat_messages from anon, authenticated;
grant select on public.global_chat_messages to authenticated;

create or replace function public.keep_six_global_chat_messages()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('sinx_global_chat_retention'));
  delete from public.global_chat_messages
  where id not in (
    select id from public.global_chat_messages
    order by created_at desc, id desc
    limit 6
  );
  return new;
end;
$$;

drop trigger if exists global_chat_keep_six on public.global_chat_messages;
create trigger global_chat_keep_six
after insert on public.global_chat_messages
for each row execute function public.keep_six_global_chat_messages();

revoke all on function public.keep_six_global_chat_messages() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'global_chat_messages'
  ) then
    alter publication supabase_realtime add table public.global_chat_messages;
  end if;
end $$;
