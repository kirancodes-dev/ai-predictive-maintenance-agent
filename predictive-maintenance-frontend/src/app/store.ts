import { create } from 'zustand';
import type { Machine } from '../types/machine.types';
import type { Alert } from '../types/alert.types';

interface AppState {
  selectedMachineId: string | null;
  setSelectedMachineId: (id: string | null) => void;

  machines: Machine[];
  setMachines: (machines: Machine[]) => void;

  unreadAlertCount: number;
  setUnreadAlertCount: (count: number) => void;

  recentAlerts: Alert[];
  addRecentAlert: (alert: Alert) => void;
}

export const useAppStore = create<AppState>(set => ({
  selectedMachineId: null,
  setSelectedMachineId: id => set({ selectedMachineId: id }),

  machines: [],
  setMachines: machines => set({ machines }),

  unreadAlertCount: 0,
  setUnreadAlertCount: count => set({ unreadAlertCount: count }),

  recentAlerts: [],
  addRecentAlert: alert =>
    set(state => ({ recentAlerts: [alert, ...state.recentAlerts].slice(0, 50) })),
}));
