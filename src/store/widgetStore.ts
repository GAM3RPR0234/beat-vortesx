import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WidgetType = 'miniplayer' | 'recentlyPlayed' | 'quickActions';
export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  enabled: boolean;
  position?: number;
}

interface WidgetState {
  widgets: WidgetConfig[];
  addWidget: (type: WidgetType, size?: WidgetSize) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<WidgetConfig>) => void;
  reorderWidgets: (widgets: WidgetConfig[]) => void;
  getEnabledWidgets: () => WidgetConfig[];
  getWidgetByType: (type: WidgetType) => WidgetConfig | undefined;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: 'miniplayer-widget',
    type: 'miniplayer',
    size: 'medium',
    enabled: true,
    position: 0,
  },
  {
    id: 'recently-played-widget',
    type: 'recentlyPlayed',
    size: 'medium',
    enabled: true,
    position: 1,
  },
  {
    id: 'quick-actions-widget',
    type: 'quickActions',
    size: 'small',
    enabled: true,
    position: 2,
  },
];

export const useWidgetStore = create<WidgetState>()(
  persist(
    (set, get) => ({
      widgets: DEFAULT_WIDGETS,

      addWidget: (type, size = 'medium') => {
        const newWidget: WidgetConfig = {
          id: `${type}-widget-${Date.now()}`,
          type,
          size,
          enabled: true,
          position: get().widgets.length,
        };
        set((state) => ({ widgets: [...state.widgets, newWidget] }));
      },

      removeWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.filter((w) => w.id !== id),
        })),

      updateWidget: (id, updates) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        })),

      reorderWidgets: (widgets) =>
        set({ widgets: widgets.map((w, i) => ({ ...w, position: i })) }),

      getEnabledWidgets: () =>
        get().widgets.filter((w) => w.enabled).sort((a, b) => (a.position || 0) - (b.position || 0)),

      getWidgetByType: (type) =>
        get().widgets.find((w) => w.type === type && w.enabled),
    }),
    {
      name: 'beat-vortex-widgets',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);