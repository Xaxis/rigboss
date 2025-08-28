import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import type { UIState, AppSettings, Toast, Panel, Theme } from '@/types';

interface UIStore extends UIState {
  settings: AppSettings;
  
  // UI Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActivePanel: (panel: Panel) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Settings Actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  
  // Toast Actions
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  backendUrl: 'http://localhost:3001',
  autoConnect: true,
  showSpectrum: true,
  spectrumPosition: 'top',
  audioAutoStart: false,
  toastPosition: 'top-right',
  logFormat: 'adif',
  callsign: '',
  grid: '',
  qth: '',
  power: 100,
  antennaInfo: '',
  rigModel: '',
};

const initialState: UIState = {
  sidebarOpen: true,
  activePanel: 'radio',
  loading: false,
  error: null,
  toasts: [],
};

export const useUIStore = create<UIStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      ...initialState,
      settings: defaultSettings,

      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      setActivePanel: (panel: Panel) => set({ activePanel: panel }),
      
      setLoading: (loading: boolean) => set({ loading }),
      
      setError: (error: string | null) => set({ error }),
      
      updateSettings: (newSettings: Partial<AppSettings>) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        }));
      },
      
      resetSettings: () => set({ settings: defaultSettings }),
      
      addToast: (toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast: Toast = { ...toast, id };
        
        set((state) => ({
          toasts: [...state.toasts, newToast]
        }));
        
        // Auto-remove toast after duration
        const duration = toast.duration || 5000;
        setTimeout(() => {
          get().removeToast(id);
        }, duration);
      },
      
      removeToast: (id: string) => {
        set((state) => ({
          toasts: state.toasts.filter(toast => toast.id !== id)
        }));
      },
      
      clearToasts: () => set({ toasts: [] }),
    })),
    {
      name: 'rigboss-ui-store',
      partialize: (state) => ({
        settings: state.settings,
        sidebarOpen: state.sidebarOpen,
        activePanel: state.activePanel,
      }),
    }
  )
);

// Selectors for optimized subscriptions
export const useSidebarOpen = () => useUIStore((state) => state.sidebarOpen);
export const useActivePanel = () => useUIStore((state) => state.activePanel);
export const useLoading = () => useUIStore((state) => state.loading);
export const useError = () => useUIStore((state) => state.error);
export const useToasts = () => useUIStore((state) => state.toasts);
export const useSettings = () => useUIStore((state) => state.settings);

// Toast helper
export const toast = {
  success: (title: string, message?: string) => 
    useUIStore.getState().addToast({ type: 'success', title, message }),
  error: (title: string, message?: string) => 
    useUIStore.getState().addToast({ type: 'error', title, message }),
  warning: (title: string, message?: string) => 
    useUIStore.getState().addToast({ type: 'warning', title, message }),
  info: (title: string, message?: string) => 
    useUIStore.getState().addToast({ type: 'info', title, message }),
};
