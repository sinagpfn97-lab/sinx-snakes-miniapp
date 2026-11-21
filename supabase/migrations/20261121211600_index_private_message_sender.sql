create index if not exists messages_sender_created_idx on public.messages(sender_id, created_at desc);
