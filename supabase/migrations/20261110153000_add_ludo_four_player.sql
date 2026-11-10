-- Four-player Ludo RPCs. State is stored per room; player.position remains untouched for Snakes.
create or replace function public.roll_ludo_room(p_room_code text, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_room public.rooms%rowtype;
  v_player public.players%rowtype;
  v_dice integer;
  v_tokens jsonb;
  v_valid jsonb := '[]'::jsonb;
  v_i integer;
  v_progress integer;
  v_id text := gen_random_uuid()::text;
  v_pending jsonb;
  v_state jsonb;
  v_next integer;
begin
  select * into v_room from public.rooms where code=upper(trim(p_room_code)) for update;
  if not found or v_room.status <> 'playing' then raise exception 'بازی در حال اجرا نیست'; end if;
  if coalesce(v_room.game_state->>'game_type','snakes') <> 'ludo' then raise exception 'این اتاق منچ نیست'; end if;
  select * into v_player from public.players where room_id=v_room.id and auth_user_id=p_user_id for update;
  if not found then raise exception 'شما عضو این اتاق نیستید'; end if;
  if v_player.seat <> v_room.current_turn then raise exception 'هنوز نوبت شما نیست'; end if;
  if v_room.game_state ? 'pending_move' then raise exception 'ابتدا حرکت قبلی را کامل کنید'; end if;
  v_dice := floor(random()*6)::integer+1;
  v_tokens := coalesce(v_room.game_state->'ludo_tokens','{}'::jsonb);
  for v_i in 0..3 loop
    v_progress := coalesce((v_tokens->(v_player.seat::text)->>v_i)::integer,0);
    if (v_progress=0 and v_dice=6) or (v_progress>0 and v_progress<57 and v_progress+v_dice<=57) then
      v_valid := v_valid || to_jsonb(v_i);
    end if;
  end loop;
  v_pending := jsonb_build_object('id',v_id,'user_id',p_user_id,'seat',v_player.seat,'dice',v_dice,'valid_tokens',v_valid);
  v_state := coalesce(v_room.game_state,'{}'::jsonb) || jsonb_build_object(
    'last_roll',jsonb_build_object('id',v_id,'user_id',p_user_id,'seat',v_player.seat,'dice',v_dice));
  if jsonb_array_length(v_valid)=0 then
    select min(seat) into v_next from public.players where room_id=v_room.id and seat>v_player.seat;
    if v_next is null then select min(seat) into v_next from public.players where room_id=v_room.id; end if;
    update public.rooms set game_state=v_state,current_turn=v_next,updated_at=now() where id=v_room.id;
    return jsonb_build_object('success',true,'dice',v_dice,'rollId',v_id,'validTokens',v_valid,'skipped',true,'nextTurn',v_next);
  end if;
  v_state := v_state || jsonb_build_object('pending_move',v_pending);
  update public.rooms set game_state=v_state,updated_at=now() where id=v_room.id;
  return jsonb_build_object('success',true,'dice',v_dice,'rollId',v_id,'validTokens',v_valid,'pendingMove',v_pending);
end $$;

create or replace function public.move_ludo_room(p_room_code text,p_user_id uuid,p_token_index integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_room public.rooms%rowtype;
  v_player public.players%rowtype;
  v_pending jsonb;
  v_tokens jsonb;
  v_own jsonb;
  v_valid jsonb;
  v_dice integer;
  v_old integer;
  v_from integer;
  v_new integer;
  v_global integer;
  v_safe integer[] := array[0,8,13,21,26,34,39,47];
  v_seat integer;
  v_t integer;
  v_other jsonb;
  v_captured boolean := false;
  v_win boolean := false;
  v_next integer;
  v_id text;
  v_state jsonb;
begin
  select * into v_room from public.rooms where code=upper(trim(p_room_code)) for update;
  if not found or v_room.status <> 'playing' or coalesce(v_room.game_state->>'game_type','snakes') <> 'ludo' then raise exception 'بازی منچ فعال نیست'; end if;
  select * into v_player from public.players where room_id=v_room.id and auth_user_id=p_user_id for update;
  if not found or v_player.seat<>v_room.current_turn then raise exception 'نوبت شما نیست'; end if;
  v_pending:=v_room.game_state->'pending_move';
  if v_pending is null or (v_pending->>'user_id')::uuid<>p_user_id then raise exception 'حرکت معتبری وجود ندارد'; end if;
  v_valid:=v_pending->'valid_tokens';
  if not coalesce(v_valid,'[]'::jsonb) @> jsonb_build_array(p_token_index) then raise exception 'این مهره امکان حرکت ندارد'; end if;
  v_dice:=(v_pending->>'dice')::integer; v_id:=v_pending->>'id';
  v_tokens:=coalesce(v_room.game_state->'ludo_tokens','{}'::jsonb);
  v_own:=coalesce(v_tokens->(v_player.seat::text),'[0,0,0,0]'::jsonb);
  v_old:=coalesce((v_own->>p_token_index)::integer,0);
  v_from:=v_old;
  v_new:=case when v_old=0 then 1 else v_old+v_dice end;
  v_own:=jsonb_set(v_own,array[p_token_index::text],to_jsonb(v_new),true);
  v_tokens:=jsonb_set(v_tokens,array[v_player.seat::text],v_own,true);
  if v_new between 1 and 51 then
    v_global:=((v_player.seat*13+v_new-1)%52);
    if not (v_global=any(v_safe)) then
      for v_seat in 0..3 loop
        if v_seat<>v_player.seat then
          v_other:=coalesce(v_tokens->(v_seat::text),'[0,0,0,0]'::jsonb);
          for v_t in 0..3 loop
            v_old:=coalesce((v_other->>v_t)::integer,0);
            if v_old between 1 and 51 and ((v_seat*13+v_old-1)%52)=v_global then
              v_other:=jsonb_set(v_other,array[v_t::text],'0'::jsonb,true);
              v_captured:=true;
            end if;
          end loop;
          v_tokens:=jsonb_set(v_tokens,array[v_seat::text],v_other,true);
        end if;
      end loop;
    end if;
  end if;
  v_win:=true;
  for v_t in 0..3 loop
    if coalesce((v_own->>v_t)::integer,0)<>57 then v_win:=false; end if;
  end loop;
  if v_win then
    v_next:=v_player.seat;
  elsif v_dice=6 or v_captured then
    v_next:=v_player.seat;
  else
    select min(seat) into v_next from public.players where room_id=v_room.id and seat>v_player.seat;
    if v_next is null then select min(seat) into v_next from public.players where room_id=v_room.id; end if;
  end if;
  v_state:=(coalesce(v_room.game_state,'{}'::jsonb)-'pending_move')||
    jsonb_build_object('ludo_tokens',v_tokens,'last_move',jsonb_build_object('id',v_id,'user_id',p_user_id,'seat',v_player.seat,'dice',v_dice,'token_index',p_token_index,'from_progress',v_from,'to_progress',v_new,'captured',v_captured));
  update public.rooms set game_state=v_state,current_turn=v_next,status=case when v_win then 'finished' else status end,updated_at=now() where id=v_room.id returning * into v_room;
  return jsonb_build_object('success',true,'room',to_jsonb(v_room),'players',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'player_name',p.player_name,'seat',p.seat,'position',p.position,'is_host',p.is_host) order by p.seat),'[]'::jsonb) from public.players p where p.room_id=v_room.id),'dice',v_dice,'rollId',v_id,'tokenIndex',p_token_index,'captured',v_captured,'winner',v_win,'nextTurn',v_next);
end $$;

create or replace function public.auto_play_ludo_room(p_room_code text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_room public.rooms%rowtype; v_player public.players%rowtype; v_roll jsonb; v_move jsonb; v_valid jsonb; v_pick integer;
begin
 select * into v_room from public.rooms where code=upper(trim(p_room_code)) for update;
 if not found or v_room.status<>'playing' or coalesce(v_room.game_state->>'game_type','snakes')<>'ludo' then return jsonb_build_object('success',false,'skipped',true); end if;
 select * into v_player from public.players where room_id=v_room.id and seat=v_room.current_turn for update;
 if not found or v_player.auth_user_id is null then return jsonb_build_object('success',false,'skipped',true); end if;
 if v_player.bot_controlled and v_player.last_seen_at>now()-interval '5 seconds' then
   update public.players set bot_controlled=false where id=v_player.id;
   return jsonb_build_object('success',false,'skipped',true,'reclaimed',true);
 end if;
 if v_player.bot_controlled then
   if v_room.updated_at>now()-interval '1.5 seconds' then return jsonb_build_object('success',false,'skipped',true,'waiting','bot_turn_delay'); end if;
 elsif v_room.updated_at>now()-interval '15 seconds' then
   return jsonb_build_object('success',false,'skipped',true,'waiting','initial_timeout');
 end if;
 update public.players set bot_controlled=true where id=v_player.id;
 if v_room.game_state ? 'pending_move' then
   v_valid:=v_room.game_state->'pending_move'->'valid_tokens';
   if jsonb_array_length(coalesce(v_valid,'[]'::jsonb))=0 then
     update public.rooms set game_state=game_state-'pending_move',current_turn=coalesce((select min(seat) from public.players where room_id=v_room.id and seat>v_player.seat),(select min(seat) from public.players where room_id=v_room.id)),updated_at=now() where id=v_room.id;
     return jsonb_build_object('success',true,'bot',true,'skippedMove',true);
   end if;
   v_pick:=(v_valid->>0)::integer;
 else
   v_roll:=public.roll_ludo_room(v_room.code,v_player.auth_user_id);
   v_valid:=v_roll->'validTokens';
   if jsonb_array_length(coalesce(v_valid,'[]'::jsonb))=0 then
     update public.rooms set game_state=game_state-'pending_move',current_turn=coalesce((select min(seat) from public.players where room_id=v_room.id and seat>v_player.seat),(select min(seat) from public.players where room_id=v_room.id)),updated_at=now() where id=v_room.id;
     return jsonb_build_object('success',true,'bot',true,'roll',v_roll,'skippedMove',true);
   end if;
   v_pick:=(v_valid->>0)::integer;
 end if;
 v_move:=public.move_ludo_room(v_room.code,v_player.auth_user_id,v_pick);
 return jsonb_build_object('success',true,'bot',true,'roll',v_roll,'move',v_move);
end $$;

revoke all on function public.roll_ludo_room(text,uuid) from public,anon,authenticated;
revoke all on function public.move_ludo_room(text,uuid,integer) from public,anon,authenticated;
revoke all on function public.auto_play_ludo_room(text) from public,anon,authenticated;
grant execute on function public.roll_ludo_room(text,uuid) to service_role;
grant execute on function public.move_ludo_room(text,uuid,integer) to service_role;
grant execute on function public.auto_play_ludo_room(text) to service_role;
