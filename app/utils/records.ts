import { InputFormat, type INewRecord } from '~/types/record';
import { FIRST_BATCH } from '~/constants/record';

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
