import type { INavPillItem } from '~/components/app/NavPills/INavPills';

/** Route names of the main pages (Nuxt file-based routes). */
export enum RouteName {
  Index = 'index',
  Dashboard = 'dashboard',
  Logs = 'logs',
  Settings = 'settings'
}

/** Main pages, shown in the header NavPills and the mobile ☰ menu. */
export const NAVIGATION_ITEMS: readonly INavPillItem[] = [
  { name: RouteName.Index, label: '首頁' },
  { name: RouteName.Dashboard, label: '儀表板' },
  { name: RouteName.Logs, label: '紀錄' },
  { name: RouteName.Settings, label: '設定' }
];
