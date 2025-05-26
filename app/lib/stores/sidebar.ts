import { atom } from 'nanostores';

export const isSidebarOpen = atom(false);

export function toggleSidebar() {
  isSidebarOpen.set(!isSidebarOpen.get());
}
