import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '@/store/playerStore';
import { DownloadTask, DownloadStatus } from '@/services/downloadService';

interface DownloadStoreState {
  completedDownloads: Track[];
  activeDownloads: DownloadTask[];
  downloadHistory: DownloadTask[];

  addCompletedDownload: (task: DownloadTask) => void;
  removeCompletedDownload: (trackId: string) => void;
  setActiveDownloads: (tasks: DownloadTask[]) => void;
  updateDownloadProgress: (taskId: string, progress: Partial<DownloadTask>) => void;
  getCompletedTracks: () => Track[];
  isDownloaded: (trackId: string) => boolean;
  clearHistory: () => void;
}

export const useDownloadStore = create<DownloadStoreState>()(
  persist(
    (set, get) => ({
      completedDownloads: [],
      activeDownloads: [],
      downloadHistory: [],

      addCompletedDownload: (task) => {
        set((state) => {
          if (state.completedDownloads.some(t => t.id === task.track.id)) {
            return state;
          }
          return {
            completedDownloads: [...state.completedDownloads, task.track],
            downloadHistory: [task, ...state.downloadHistory].slice(0, 100),
          };
        });
      },

      removeCompletedDownload: (trackId) => {
        set((state) => ({
          completedDownloads: state.completedDownloads.filter(t => t.id !== trackId),
        }));
      },

      setActiveDownloads: (tasks) => {
        set({ activeDownloads: tasks });
      },

      updateDownloadProgress: (taskId, progress) => {
        set((state) => ({
          activeDownloads: state.activeDownloads.map(task =>
            task.id === taskId ? { ...task, ...progress } : task
          ),
        }));
      },

      getCompletedTracks: () => get().completedDownloads,

      isDownloaded: (trackId) => get().completedDownloads.some(t => t.id === trackId),

      clearHistory: () => set({ downloadHistory: [] }),
    }),
    {
      name: 'beat-vortex-downloads',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        completedDownloads: state.completedDownloads,
        downloadHistory: state.downloadHistory,
      }),
    }
  )
);