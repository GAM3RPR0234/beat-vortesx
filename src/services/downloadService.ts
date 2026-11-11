import * as FileSystem from 'expo-file-system';
import { DownloadResumable, DownloadResult } from 'expo-file-system';
import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Track } from '@/store/playerStore';
import { useDownloadStore } from '@/store/downloadStore';

export type DownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'error' | 'queued';

export interface DownloadTask {
  id: string;
  track: Track;
  status: DownloadStatus;
  progress: number; // 0-1
  bytesWritten: number;
  totalBytes: number;
  speed: number; // bytes/sec
  eta: number; // seconds
  error?: string;
  localUri?: string;
  startedAt: number;
  completedAt?: number;
  resumable?: DownloadResumable;
}

const DOWNLOAD_DIR = `${FileSystem.documentDirectory}downloads/`;
const METADATA_DIR = `${FileSystem.documentDirectory}metadata/`;

class DownloadService {
  private tasks = new Map<string, DownloadTask>();
  private listeners = new Set<(tasks: DownloadTask[]) => void>();
  private activeDownloads = 0;
  private maxConcurrentDownloads = 3;
  private downloadQueue: string[] = [];

  constructor() {
    this.ensureDirectories();
    this.loadPersistedTasks();
  }

  private async ensureDirectories() {
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
    }
    const metaInfo = await FileSystem.getInfoAsync(METADATA_DIR);
    if (!metaInfo.exists) {
      await FileSystem.makeDirectoryAsync(METADATA_DIR, { intermediates: true });
    }
  }

  private async loadPersistedTasks() {
    try {
      const tasksFile = `${FileSystem.documentDirectory}download_tasks.json`;
      const info = await FileSystem.getInfoAsync(tasksFile);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(tasksFile);
        const tasks: DownloadTask[] = JSON.parse(content);
        tasks.forEach(task => {
          if (task.status === 'downloading' || task.status === 'pending' || task.status === 'queued') {
            task.status = 'paused';
            task.progress = 0;
            task.bytesWritten = 0;
          }
          this.tasks.set(task.id, task);
        });
        this.notifyListeners();
      }
    } catch (error) {
      console.warn('Failed to load persisted download tasks:', error);
    }
  }

  private async persistTasks() {
    try {
      const tasksFile = `${FileSystem.documentDirectory}download_tasks.json`;
      const tasksArray = Array.from(this.tasks.values());
      await FileSystem.writeAsStringAsync(tasksFile, JSON.stringify(tasksArray));
    } catch (error) {
      console.warn('Failed to persist download tasks:', error);
    }
  }

  private notifyListeners() {
    const tasks = Array.from(this.tasks.values())
      .sort((a, b) => b.startedAt - a.startedAt);
    this.listeners.forEach(listener => listener(tasks));
  }

  subscribe(listener: (tasks: DownloadTask[]) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  getAllTasks(): DownloadTask[] {
    return Array.from(this.tasks.values())
      .sort((a, b) => b.startedAt - a.startedAt);
  }

  getTask(id: string): DownloadTask | undefined {
    return this.tasks.get(id);
  }

  getTasksByStatus(status: DownloadStatus): DownloadTask[] {
    return Array.from(this.tasks.values()).filter(t => t.status === status);
  }

  async startDownload(track: Track): Promise<string> {
    if (!track.url) {
      throw new Error('Track has no download URL');
    }

    const existingTask = Array.from(this.tasks.values()).find(
      t => t.track.id === track.id && ['downloading', 'pending', 'queued', 'paused'].includes(t.status)
    );
    if (existingTask) {
      if (existingTask.status === 'paused') {
        await this.resumeDownload(existingTask.id);
      }
      return existingTask.id;
    }

    const taskId = `dl_${track.id}_${Date.now()}`;
    const localUri = `${DOWNLOAD_DIR}${taskId}.${this.getExtension(track.url)}`;

    const task: DownloadTask = {
      id: taskId,
      track,
      status: 'queued',
      progress: 0,
      bytesWritten: 0,
      totalBytes: 0,
      speed: 0,
      eta: 0,
      localUri,
      startedAt: Date.now(),
    };

    this.tasks.set(taskId, task);
    this.downloadQueue.push(taskId);
    this.notifyListeners();
    await this.persistTasks();
    this.processQueue();

    return taskId;
  }

  private getExtension(url: string): string {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? match[1] : 'mp3';
  }

  private async processQueue() {
    if (this.activeDownloads >= this.maxConcurrentDownloads) return;
    if (this.downloadQueue.length === 0) return;

    const taskId = this.downloadQueue.shift()!;
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'queued') {
      this.processQueue();
      return;
    }

    this.activeDownloads++;
    await this.executeDownload(task);
    this.activeDownloads--;
    this.processQueue();
  }

  private async executeDownload(task: DownloadTask) {
    if (!task.track.url) return;

    try {
      task.status = 'downloading';
      this.notifyListeners();

      const resumable = new DownloadResumable(
        task.track.url!,
        task.localUri!,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          const bytesWritten = downloadProgress.totalBytesWritten;
          const totalBytes = downloadProgress.totalBytesExpectedToWrite;

          const now = Date.now();
          const elapsed = (now - task.startedAt) / 1000;
          const speed = elapsed > 0 ? bytesWritten / elapsed : 0;
          const eta = speed > 0 ? (totalBytes - bytesWritten) / speed : 0;

          task.progress = progress;
          task.bytesWritten = bytesWritten;
          task.totalBytes = totalBytes;
          task.speed = speed;
          task.eta = eta;

          this.notifyListeners();
        }
      );

      task.resumable = resumable;
      const result = await resumable.downloadAsync();

      if (result) {
        task.status = 'completed';
        task.progress = 1;
        task.completedAt = Date.now();

        // Write metadata to file
        await this.writeMetadataToFile(task);

        // Save to media library for system access
        await this.saveToMediaLibrary(task);

        // Update download store
        useDownloadStore.getState().addCompletedDownload(task);
      } else {
        throw new Error('Download returned no result');
      }
    } catch (error: any) {
      if (error.message?.includes('cancelled') || error.message?.includes('paused')) {
        task.status = 'paused';
      } else {
        task.status = 'error';
        task.error = error.message || 'Unknown error';
      }
    }

    this.notifyListeners();
    await this.persistTasks();
  }

  private async writeMetadataToFile(task: DownloadTask) {
    // This will be implemented with ID3 writing in metadataService.ts
    const { writeMetadataToFile } = await import('@/services/metadataService');
    await writeMetadataToFile(task.localUri!, task.track);
  }

  private async saveToMediaLibrary(task: DownloadTask) {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;

      const asset = await MediaLibrary.createAssetAsync(task.localUri!);
      await MediaLibrary.createAlbumAsync('Beat Vortex', asset, false);
    } catch (error) {
      console.warn('Failed to save to media library:', error);
    }
  }

  async pauseDownload(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'downloading') return;

    if (task.resumable) {
      await task.resumable.pauseAsync();
    }
    task.status = 'paused';
    this.notifyListeners();
    await this.persistTasks();
  }

  async resumeDownload(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task || !['paused', 'queued', 'pending'].includes(task.status)) return;

    task.status = 'queued';
    this.downloadQueue.unshift(taskId);
    this.notifyListeners();
    await this.persistTasks();
    this.processQueue();
  }

  async cancelDownload(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    if (task.resumable && task.status === 'downloading') {
      await task.resumable.pauseAsync();
    }

    // Delete partial file
    if (task.localUri) {
      const info = await FileSystem.getInfoAsync(task.localUri);
      if (info.exists) {
        await FileSystem.deleteAsync(task.localUri);
      }
    }

    this.tasks.delete(taskId);
    this.downloadQueue = this.downloadQueue.filter(id => id !== taskId);
    this.notifyListeners();
    await this.persistTasks();
  }

  async deleteDownload(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    if (task.localUri) {
      const info = await FileSystem.getInfoAsync(task.localUri);
      if (info.exists) {
        await FileSystem.deleteAsync(task.localUri);
      }
    }

    this.tasks.delete(taskId);
    useDownloadStore.getState().removeCompletedDownload(task.track.id);
    this.notifyListeners();
    await this.persistTasks();
  }

  async retryDownload(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'error') return;

    // Reset task
    task.status = 'queued';
    task.progress = 0;
    task.bytesWritten = 0;
    task.error = undefined;
    task.startedAt = Date.now();

    if (task.localUri) {
      const info = await FileSystem.getInfoAsync(task.localUri);
      if (info.exists) {
        await FileSystem.deleteAsync(task.localUri);
      }
    }

    this.downloadQueue.unshift(taskId);
    this.notifyListeners();
    await this.persistTasks();
    this.processQueue();
  }

  formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }

  formatETA(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '--';
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
    return `${Math.ceil(seconds / 3600)}h`;
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  getActiveDownloadsCount(): number {
    return this.activeDownloads;
  }

  getQueuedCount(): number {
    return this.downloadQueue.length;
  }

  async clearCompleted() {
    const completedTasks = Array.from(this.tasks.entries())
      .filter(([_, task]) => task.status === 'completed');

    for (const [id, task] of completedTasks) {
      this.tasks.delete(id);
      useDownloadStore.getState().removeCompletedDownload(task.track.id);
    }

    this.notifyListeners();
    await this.persistTasks();
  }

  async cleanup() {
    for (const task of this.tasks.values()) {
      if (task.resumable && task.status === 'downloading') {
        await task.resumable.pauseAsync();
      }
    }
  }
}

export const downloadService = new DownloadService();