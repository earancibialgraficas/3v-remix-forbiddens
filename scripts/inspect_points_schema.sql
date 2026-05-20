-- Pega el resultado de estas consultas para revisar como estan guardados puntos, wallets y RPCs.

select
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'profiles',
    'point_events',
    'leaderboard_scores',
    'point_wallets',
    'casino_wagers',
    'user_inventory',
    'inventory_trade_offers'
  )
order by table_name, ordinal_position;

select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
left join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
  and tc.table_schema = ccu.table_schema
where tc.table_schema = 'public'
  and tc.table_name in (
    'profiles',
    'point_events',
    'leaderboard_scores',
    'point_wallets',
    'casino_wagers',
    'user_inventory',
    'inventory_trade_offers'
  )
order by tc.table_name, tc.constraint_name;

select
  proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'award_multiplayer_win',
    'settle_casino_wager',
    'convert_stat_points_to_fcoins',
    'recalculate_total_score',
    'award_bonus_points'
  )
order by proname, arguments;

select
  source_type,
  count(*) as events,
  min(created_at) as first_seen,
  max(created_at) as last_seen,
  sum(points) as total_points
from public.point_events
group by source_type
order by last_seen desc nulls last;
