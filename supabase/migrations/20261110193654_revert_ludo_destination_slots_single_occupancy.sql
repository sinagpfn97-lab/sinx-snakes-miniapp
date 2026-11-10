-- Revert the single-occupancy restriction introduced by
-- 20261110191429_ludo_destination_slots_single_occupancy.
-- Keep the classic 48-cell Ludo rules from the v1.0.22 baseline.
do $rollback$
declare
  v_def text;
  v_new text;
begin
  v_def := pg_get_functiondef('public.roll_ludo_room(text, uuid)'::regprocedure);
  v_new := replace(
    v_def,
    $patched$if ((v_progress = 0 and v_dice = 6)
        or (v_progress between 1 and 51 and v_progress + v_dice <= 52))
       and not (
         (case when v_progress = 0 then 1 else v_progress + v_dice end) between 49 and 52
         and exists (
           select 1 from generate_series(0, 3) as occupied(token_index)
           where occupied.token_index <> v_i
             and coalesce((v_tokens->(v_player.seat::text)->>occupied.token_index)::integer, 0)
                 = case when v_progress = 0 then 1 else v_progress + v_dice end
         )
       ) then$patched$,
    $original$if (v_progress = 0 and v_dice = 6)
       or (v_progress between 1 and 51 and v_progress + v_dice <= 52) then$original$
  );
  if v_new = v_def then
    raise exception 'Could not reverse roll_ludo_room destination occupancy rule';
  end if;
  execute v_new;

  v_def := pg_get_functiondef('public.move_ludo_room(text, uuid, integer)'::regprocedure);
  v_new := replace(
    v_def,
    $patched$  if v_new between 49 and 52 and exists (
    select 1 from generate_series(0, 3) as occupied(token_index)
    where occupied.token_index <> p_token_index
      and coalesce((v_own->>occupied.token_index)::integer, 0) = v_new
  ) then
    raise exception 'این جایگاه مقصد اشغال است؛ برای جایگاه خالی عدد دقیق بیاورید';
  end if;
$patched$,
    ''
  );
  if v_new = v_def then
    raise exception 'Could not reverse move_ludo_room destination occupancy rule';
  end if;
  execute v_new;
end
$rollback$;
