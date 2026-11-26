-- 儀表板彙總: one call returns everything the 儀表板 page needs, shaped like IDashboardData
-- (app/types/dashboard.ts). See docs/database.md §4.
-- security invoker: runs as the caller, so RLS still applies and only their records from the
-- last 2 years are counted. With no records: totalAmount 0, startedAt null, empty lists, and six
-- months of 0 in monthlyTotals.

create or replace function public.get_dashboard_summary()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with mine as (
    select * from public.records where user_id = (select auth.uid())
  ),
  -- The last 6 months in Taiwan time; months without records still appear with 0
  months as (
    select to_char(m, 'YYYY-MM') as month
    from generate_series(
      date_trunc('month', now() at time zone 'Asia/Taipei') - interval '5 months',
      date_trunc('month', now() at time zone 'Asia/Taipei'),
      interval '1 month'
    ) as m
  ),
  monthly as (
    select months.month, coalesce(sum(mine.total_amount), 0) as total
    from months
    left join mine on to_char(mine.created_at at time zone 'Asia/Taipei', 'YYYY-MM') = months.month
    group by months.month
  ),
  denoms as (
    select key::int as denomination, sum(value::int) as count
    from mine, jsonb_each_text(mine.denomination_counts)
    group by key
  )
  select jsonb_build_object(
    'totalAmount', (select coalesce(sum(total_amount), 0) from mine),
    'startedAt', (select min(created_at) from mine),
    'monthlyTotals', (
      select coalesce(jsonb_agg(jsonb_build_object('month', month, 'total', total) order by month), '[]'::jsonb)
      from monthly
    ),
    'denominationTotals', (
      select coalesce(jsonb_agg(jsonb_build_object('denomination', denomination, 'count', count) order by denomination desc), '[]'::jsonb)
      from denoms
    ),
    'recentRecords', (
      select coalesce(jsonb_agg(r order by r."createdAt" desc), '[]'::jsonb)
      from (
        select id, name, created_at as "createdAt", entry_count as "entryCount", total_amount as "totalAmount"
        from mine
        order by created_at desc
        limit 5
      ) r
    )
  );
$$;

-- Guests have no records; only signed-in members call it
revoke execute on function public.get_dashboard_summary() from public, anon;
grant execute on function public.get_dashboard_summary() to authenticated;
