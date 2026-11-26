import { computed } from 'vue';
import type { IDashboardData } from '~/types/dashboard';

// TODO(supabase): replace this mock with the signed-in user's data from Supabase
// (sum of all exchanges, first exchange date, per-month totals for the last 6 months,
// accumulated denomination counts and the latest exchanges). Keep the IDashboardData shape
// and the page needs no template changes.
const MOCK_DASHBOARD: IDashboardData = {
  totalAmount: 494999,
  startedAt: '2026-06-01T12:00:00+08:00',
  monthlyTotals: [
    { month: '2026-06', total: 72400 },
    { month: '2026-07', total: 107249 },
    { month: '2026-08', total: 88250 },
    { month: '2026-09', total: 130800 },
    { month: '2026-10', total: 96300 },
    { month: '2026-11', total: 0 }
  ],
  denominationTotals: [
    { denomination: 2000, count: 214 },
    { denomination: 1000, count: 38 },
    { denomination: 500, count: 22 },
    { denomination: 200, count: 31 },
    { denomination: 100, count: 47 },
    { denomination: 50, count: 19 },
    { denomination: 10, count: 36 },
    { denomination: 5, count: 12 },
    { denomination: 1, count: 27 }
  ],
  recentRecords: [
    { id: 'mock-1', name: '10月薪資', createdAt: '2026-10-17T12:00:00+08:00', entryCount: 12, totalAmount: 96300 },
    { id: 'mock-2', name: '9月薪資', createdAt: '2026-09-16T12:00:00+08:00', entryCount: 12, totalAmount: 94800 },
    { id: 'mock-3', name: '中秋獎金', createdAt: '2026-09-30T12:00:00+08:00', entryCount: 12, totalAmount: 36000 },
    { id: 'mock-4', name: '8月薪資', createdAt: '2026-08-15T12:00:00+08:00', entryCount: 11, totalAmount: 88250 },
    { id: 'mock-5', name: '7月工讀費', createdAt: '2026-07-31T12:00:00+08:00', entryCount: 4, totalAmount: 18999 }
  ]
};

/** 儀表板 data: accumulated totals, monthly trend, denomination counts and recent exchanges. */
export const useDashboard = () => {
  const data = computed<IDashboardData>(() => MOCK_DASHBOARD);

  return {
    totalAmount: computed(() => data.value.totalAmount),
    startedAt: computed(() => data.value.startedAt),
    monthlyTotals: computed(() => data.value.monthlyTotals),
    denominationTotals: computed(() => data.value.denominationTotals),
    recentRecords: computed(() => data.value.recentRecords)
  };
};
