revoke select on public.global_chat_messages from anon;
grant select on public.global_chat_messages to authenticated;
