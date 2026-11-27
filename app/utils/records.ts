import { InputFormat, type INewRecord, type IRecordSummary, type IRecordCounts, type IRecordDetail, type IRecordPeriod } from '~/types/record';
import { FIRST_BATCH, RECORDS_MAX_RESULTS, RECORDS_PAGE_SIZE } from '~/constants/record';
import type { IDashboardData } from '~/types/dashboard';

interface IRecordRow {
  id: string; name: string; created_at: string; entry_count: number; total_amount: number;
  input_format: InputFormat; denominations: number[];
  denomination_counts: Record<number, number>; rows: { name: string; total: number }[];
}

export function buildRecordName(date: Date, batch: number): string {
  const formattedDate = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  let name = `${formattedDate} 兌換`;

  if (batch > FIRST_BATCH) {
    name += ` #${batch}`;
  }

  return name;
}

export async function insertRecord(record: INewRecord): Promise<string> {
  const supabase = useNuxtApp().$supabase;
  const { error, data } = await supabase.from('records').insert({
    name: record.name,
    input_format: record.inputFormat,
    entry_count: record.entryCount,
    total_amount: record.totalAmount,
    denominations: record.denominations,
    denomination_counts: record.denominationCounts,
    rows: record.rows
  }).select('id').single()
  
  if (error) {
    throw error;
  }
  return data.id;
}

export function toInputFormat(includesNames: boolean): InputFormat {
  return includesNames ? InputFormat.NameAndAmount : InputFormat.AmountOnly;
}

const toRecordSummary = (row: IRecordRow): IRecordSummary => ({
  id: row.id, name: row.name, createdAt: row.created_at,
  entryCount: row.entry_count, totalAmount: row.total_amount,
});

const toRecordCounts = (row: IRecordRow): IRecordCounts => ({
  ...toRecordSummary(row),
  denominations: row.denominations,
  denominationCounts: row.denomination_counts,
});

const toRecordDetail = (row: IRecordRow): IRecordDetail => ({
  ...toRecordCounts(row),
  inputFormat: row.input_format,
  rows: row.rows,
});

export async function fetchDashboard(): Promise<IDashboardData> {
  const supabase = useNuxtApp().$supabase;
  const { error, data } = await supabase.rpc('get_dashboard_summary');

  if (error) {
    throw error;
  }
  
  return data as IDashboardData;
}

export async function fetchRecordList(period: IRecordPeriod, page: number): Promise<{ records: IRecordSummary[]; totalCount: number }> {
  const from = (page - 1) * RECORDS_PAGE_SIZE;
  const to = Math.min(page * RECORDS_PAGE_SIZE, RECORDS_MAX_RESULTS) - 1;
  const supabase = useNuxtApp().$supabase;

  let query = supabase.from('records')
    .select('id, name, created_at, entry_count, total_amount', { count: 'exact' })
    .gte('created_at', period.from);
  if (period.to) query = query.lt('created_at', period.to);

  const { error, count, data } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  return {
    records: (data as IRecordRow[]).map(toRecordSummary),
    totalCount: Math.min(count ?? 0, RECORDS_MAX_RESULTS)
  };
}

export async function fetchRecord(id: string): Promise<IRecordDetail> {
  const supabase = useNuxtApp().$supabase;
  const { error, data } = await supabase.from('records')
    .select('*')
    .eq('id', id).single();

  if (error) {
    throw error;
  }

  return toRecordDetail(data as IRecordRow);
}

export async function updateRecordName(recordId: string, name: string) {
  const supabase = useNuxtApp().$supabase;
  const { error } = await supabase.from('records')
    .update({ name })
    .eq('id', recordId)
    .select('id').single();

  if (error) {
    throw error;
  }
}

export async function fetchRangeRecords(period: IRecordPeriod): Promise<IRecordCounts[]> {
  const supabase = useNuxtApp().$supabase;
  let query = supabase.from('records')
    .select('id, name, created_at, entry_count, total_amount, denominations, denomination_counts')
    .gte('created_at', period.from);
  if (period.to) query = query.lt('created_at', period.to);

  const { error, data } = await query
    .order('created_at', { ascending: false })
    .limit(RECORDS_MAX_RESULTS);

  if (error) {
    throw error;
  }

  return (data as IRecordRow[]).map(toRecordCounts);
}
