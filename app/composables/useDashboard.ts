import { computed } from 'vue';
import { fetchDashboard } from '~/utils/records';

/** 儀表板 data: accumulated totals, monthly trend, denomination counts and recent exchanges. */
export const useDashboard = async () => {
  const { data, status, error, refresh } = await useAsyncData('dashboard', fetchDashboard);

  return {
    totalAmount: computed(() => data.value?.totalAmount ?? 0),
    startedAt: computed(() => data.value?.startedAt ?? null),
    monthlyTotals: computed(() => data.value?.monthlyTotals ?? []),
    denominationTotals: computed(() => data.value?.denominationTotals ?? []),
    recentRecords: computed(() => data.value?.recentRecords ?? []),
    status,
    error,
    refresh
  };
};
