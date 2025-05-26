import { atom } from 'nanostores';

export const isSidebarOpen = atom(false);

export function toggleSidebar() {
  const currentValue = isSidebarOpen.get();
  isSidebarOpen.set(!currentValue);
}
