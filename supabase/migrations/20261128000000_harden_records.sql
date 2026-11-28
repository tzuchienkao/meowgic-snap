-- 收緊 records 的寫入權限與資料大小。See docs/database.md §3.
-- 執行前先確認既有資料符合下面的 check（不符合時這份 migration 會整個失敗，不會改到一半）。

-- 1. Column privileges: RLS decides which rows, these decide which columns.
--    Members only ever rename a record (updateRecordName), so update is limited to name; insert
--    cannot set id / user_id / created_at / updated_at (they come from their defaults), so a
--    record's date can't be moved to dodge the 2-year limit. Guests (anon) get nothing.
revoke insert, update on public.records from anon, authenticated;
grant insert (name, input_format, entry_count, total_amount, denominations, denomination_counts, rows)
  on public.records to authenticated;
grant update (name) on public.records to authenticated;

-- 2. Size limits, so a direct API call can't store far more than the app ever sends:
--    at most 10 denominations, one row per name (≤ entry_count ≤ 1000), and a byte cap per jsonb.
alter table public.records
  add constraint records_denominations_size
    check (cardinality(denominations) between 1 and 10),
  add constraint records_denomination_counts_shape
    check (jsonb_typeof(denomination_counts) = 'object' and octet_length(denomination_counts::text) <= 1024),
  add constraint records_rows_shape
    check (
      jsonb_typeof(rows) = 'array'
      and jsonb_array_length(rows) between 1 and entry_count
      and octet_length(rows::text) <= 100000
    );
