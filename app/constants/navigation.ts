import type { INavPillItem } from '~/components/app/NavPills/INavPills';

/** Main pages, shown in the header NavPills and the mobile ☰ menu. */
export const NAVIGATION_ITEMS: readonly INavPillItem[] = [
  { name: 'index', label: '首頁' },
  { name: 'dashboard', label: '儀表板' },
  { name: 'logs', label: '紀錄' },
  { name: 'settings', label: '設定' }
];
