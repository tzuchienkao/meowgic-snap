-- Delete records older than 2 years every day (Supabase pg_cron). See docs/database.md §5.
-- Runs as the database owner, so RLS does not apply and everyone's old records are removed.
--   List jobs:     select * from cron.job;
--   Recent runs:   select * from cron.job_run_details order by start_time desc limit 10;
--   Remove job:    select cron.unschedule('delete-records-older-than-2-years');

create extension if not exists pg_cron with schema pg_catalog;

-- Every day at 19:00 UTC (03:00 in Taiwan)
select cron.schedule(
  'delete-records-older-than-2-years',
  '0 19 * * *',
  $$ delete from public.records where created_at < now() - interval '2 years' $$
);
