create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_distinct_users check (user_a <> user_b),
  constraint conversations_canonical_pair check (user_a < user_b),
  constraint conversations_pair_unique unique (user_a, user_b)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  message_type text not null default 'text' check (message_type in ('text','room_invite')),
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint messages_distinct_users check (sender_id <> recipient_id),
  constraint messages_body_or_invite check (
    (message_type = 'text' and body is not null and length(btrim(body)) between 1 and 1000)
    or (message_type = 'room_invite' and body is not null and length(btrim(body)) between 1 and 500)
  )
);

create index if not exists conversations_user_a_idx on public.conversations(user_a, created_at desc);
create index if not exists conversations_user_b_idx on public.conversations(user_b, created_at desc);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at desc);
create index if not exists messages_recipient_unread_idx on public.messages(recipient_id, read_at) where read_at is null;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversation participants can read" on public.conversations;
create policy "conversation participants can read" on public.conversations
for select to authenticated
using ((select auth.uid()) = user_a or (select auth.uid()) = user_b);

drop policy if exists "message participants can read" on public.messages;
create policy "message participants can read" on public.messages
for select to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);

grant select on public.conversations, public.messages to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
