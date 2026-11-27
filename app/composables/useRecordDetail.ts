import { computed, type Ref } from 'vue';
import { fetchRecord } from '~/utils/records';

/** The whole record of the selected row; refetched when the id changes, keeping the old one until then */
export const useRecordDetail = async (id: Ref<string | null>) => {
  const { data, status, error, refresh } = await useAsyncData(
    'records-detail',
    () => (id.value ? fetchRecord(id.value) : Promise.resolve(null)),
    { watch: [id] },
  );
  return {
    selectedRecord: computed(() => data.value ?? undefined),
    status,
    error,
    refresh,
  };
};
