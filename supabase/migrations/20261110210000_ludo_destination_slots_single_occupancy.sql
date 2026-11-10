
-- Enforce one token per home-lane destination slot (progress 49..52).
-- The roll function hides blocked tokens from valid_tokens; the move function
-- independently rejects stale or forged moves into an occupied slot.
do $migration$
declare
  v_def text;
  v_new text;
begin
  v_def := pg_get_functiondef('public.roll_ludo_room(text, uuid)'::regprocedure);
  v_new := replace(
    v_def,
    'if (v_progress = 0 and v_dice = 6)' || chr(10) ||
    '       or (v_progress between 1 and 51 and v_progress + v_dice <= 52) then',
    'if ((v_progress = 0 and v_dice = 6)' || chr(10) ||
    '        or (v_progress between 1 and 51 and v_progress + v_dice <= 52))' || chr(10) ||
    '       and not (' || chr(10) ||
    '         (case when v_progress = 0 then 1 else v_progress + v_dice end) between 49 and 52' || chr(10) ||
    '         and exists (' || chr(10) ||
    '           select 1 from generate_series(0, 3) as occupied(token_index)' || chr(10) ||
    '           where occupied.token_index <> v_i' || chr(10) ||
    '             and coalesce((v_tokens->(v_player.seat::text)->>occupied.token_index)::integer, 0)' || chr(10) ||
    '                 = case when v_progress = 0 then 1 else v_progress + v_dice end' || chr(10) ||
    '         )' || chr(10) ||
    '       ) then'
  );
  if v_new = v_def then
    raise exception 'Could not patch roll_ludo_room destination occupancy rule';
  end if;
  execute v_new;

  v_def := pg_get_functiondef('public.move_ludo_room(text, uuid, integer)'::regprocedure);
  v_new := replace(
    v_def,
    'if v_new > 52 then raise exception ''برای رسیدن به مقصد باید عدد دقیق بیاورید''; end if;',
    'if v_new > 52 then raise exception ''برای رسیدن به مقصد باید عدد دقیق بیاورید''; end if;' || chr(10) ||
    chr(10) ||
    '  if v_new between 49 and 52 and exists (' || chr(10) ||
    '    select 1 from generate_series(0, 3) as occupied(token_index)' || chr(10) ||
    '    where occupied.token_index <> p_token_index' || chr(10) ||
    '      and coalesce((v_own->>occupied.token_index)::integer, 0) = v_new' || chr(10) ||
    '  ) then' || chr(10) ||
    '    raise exception ''این جایگاه مقصد اشغال است؛ برای جایگاه خالی عدد دقیق بیاورید'';' || chr(10) ||
    '  end if;'
  );
  if v_new = v_def then
    raise exception 'Could not patch move_ludo_room destination occupancy rule';
  end if;
  execute v_new;
end
$migration$;
