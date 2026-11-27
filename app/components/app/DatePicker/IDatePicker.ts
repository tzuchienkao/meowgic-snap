/** A picked date range: "YYYY-MM-DD" days, both included */
export interface IDateRange {
  start: string;
  end: string;
}

/** What the calendar panel shows */
export enum CalendarView {
  Days = 'days',
  Months = 'months',
  Years = 'years',
}
