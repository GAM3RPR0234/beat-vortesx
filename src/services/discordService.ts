// Beat Vortex - Discord Rich Presence Service
// WebSocket connection to local Discord client for Rich Presence
//
// ⚠️ LIMITACIONES EN MÓVIL/WEB:
// - React Native NO tiene acceso a Unix Domain Sockets (discord-ipc-0)
// - Discord IPC requiere entorno Node.js nativo (Electron, Tauri, Node.js desktop)
// - En móvil/web, esta servicio SOLO construye el objeto de presencia
// - Para Discord Rich Presence real en móvil, se requiere:
//   1. App desktop companion (Electron/Tauri) que conecte a Discord IPC
//   2. WebSocket/WebRTC bridge entre app móvil y app desktop
//   3. O backend webhook que actualice presencia via Discord API (limitado)
// - Esta implementación está lista para desktop; en móvil solo loggea la presencia

import { Track } from '@/store/playerStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DiscordPresence {
  state?: string;       // "Listening to..."
  details?: string;     // Track title
  largeImageKey?: string;    // Album art key
  largeImageText?: string;   // Hover text for large image
  smallImageKey?: string;    // Small image (play/pause)
  smallImageText?: string;   // Hover text for small image
  startTimestamp?: number;   // Unix timestamp when started
  endTimestamp?: number;     // Unix timestamp when ends
  partyId?: string;          // Party ID for listen along
  partySize?: [number, number]; // [current, max]
  buttons?: Array<{ label: string; url: string }>; // Max 2 buttons
}

export interface DiscordSettings {
  enabled: boolean;
  showTrack: boolean;
  showArtist: boolean;
  showAlbum: boolean;
  showProgress: boolean;
  showButtons: boolean;
  customState?: string;
}

const STORAGE_KEY = 'beat-vortex-discord';
const DISCORD_IPC_PATH = 'discord-ipc-0'; // Unix socket path (not usable on mobile/web)
// For mobile/web, we use a different approach via webhook or local server

class DiscordService {
  private settings: DiscordSettings = {
    enabled: false,
    showTrack: true,
    showArtist: true,
    showAlbum: true,
    showProgress: true,
    showButtons: true,
  };
  private currentTrack: Track | null = null;
  private isPlaying = false;
  private progress = 0;
  private duration = 0;
  private startTime = 0;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Set<(presence: DiscordPresence | null) => void> = new Set();

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load Discord settings:', error);
    }

    // Note: On mobile, we cannot connect directly to Discord IPC
    // This service provides the structure for desktop (via Electron/desktop wrapper)
    // or can be extended with a webhook-based approach
    console.log('Discord Rich Presence service initialized (mobile mode - webhook/desktop bridge needed)');
  }

  private async persist() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to persist Discord settings:', error);
    }
    this.notifyListeners();
  }

  private notifyListeners() {
    const presence = this.buildPresence();
    this.listeners.forEach(listener => listener(presence));
  }

  subscribe(listener: (presence: DiscordPresence | null) => void) {
    this.listeners.add(listener);
    // Send current presence immediately
    listener(this.buildPresence());
    return () => { this.listeners.delete(listener); };
  }

  getSettings(): DiscordSettings {
    return { ...this.settings };
  }

  async setSettings(settings: Partial<DiscordSettings>) {
    this.settings = { ...this.settings, ...settings };
    await this.persist();
  }

  isEnabled(): boolean {
    return this.settings.enabled;
  }

  /**
   * Update current playback state
   */
  updatePlayback(track: Track | null, isPlaying: boolean, progress: number, duration: number) {
    const wasPlaying = this.isPlaying;
    this.currentTrack = track;
    this.isPlaying = isPlaying;
    this.progress = progress;
    this.duration = duration;

    if (isPlaying && !wasPlaying) {
      this.startTime = Date.now() - (progress * duration * 1000);
    } else if (!isPlaying && wasPlaying) {
      // Paused - keep startTime for resume calculation
    }

    this.notifyListeners();

    // For desktop: send to Discord IPC
    this.sendToDiscord();
  }

  /**
   * Build Discord Rich Presence object
   */
  buildPresence(): DiscordPresence | null {
    if (!this.settings.enabled || !this.currentTrack) return null;

    const track = this.currentTrack;
    const details = this.settings.showTrack ? track.title : undefined;
    const stateParts: string[] = [];

    if (this.settings.showArtist) stateParts.push(`by ${track.artist}`);
    if (this.settings.showAlbum && track.album) stateParts.push(`on ${track.album}`);

    const state = stateParts.length > 0 ? stateParts.join(' · ') : undefined;

    const presence: DiscordPresence = {
      details,
      state: this.settings.customState || state,
    };

    // Album artwork
    if (track.artwork) {
      presence.largeImageKey = 'album_art'; // Would need to upload to Discord CDN
      presence.largeImageText = `${track.title} by ${track.artist}`;
    }

    // Play/pause indicator
    presence.smallImageKey = this.isPlaying ? 'play' : 'pause';
    presence.smallImageText = this.isPlaying ? 'Playing' : 'Paused';

    // Progress timestamps
    if (this.settings.showProgress && track.duration > 0) {
      const elapsed = this.isPlaying
        ? (Date.now() - this.startTime) / 1000
        : this.progress * track.duration;

      presence.startTimestamp = Math.floor(Date.now() / 1000) - elapsed;
      presence.endTimestamp = Math.floor(Date.now() / 1000) + (track.duration - elapsed);
    }

    // Buttons (max 2)
    if (this.settings.showButtons) {
      presence.buttons = [
        { label: 'Listen on Beat Vortex', url: `beatvortex://track/${track.id}` },
        { label: 'View Artist', url: `beatvortex://artist/${encodeURIComponent(track.artist)}` },
      ];
    }

    return presence;
  }

  /**
   * Send presence to Discord (desktop only via IPC)
   * This is a placeholder for desktop implementation
   */
  private async sendToDiscord() {
    if (!this.settings.enabled) return;

    const presence = this.buildPresence();
    if (!presence) return;

    // On desktop (Electron/Tauri), this would connect to Discord IPC socket
    // On mobile/web, we'd need a backend bridge or webhook

    // Example for desktop (not functional on mobile):
    /*
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connectIPC();
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        cmd: 'SET_ACTIVITY',
        args: { pid: process.pid, activity: presence },
        nonce: Date.now().toString(),
      }));
    }
    */

    // For now, just log for debugging
    console.log('Discord Presence Update:', JSON.stringify(presence, null, 2));
  }

  /**
   * Connect to Discord IPC (desktop only)
   */
  private async connectIPC(): Promise<boolean> {
    // This requires Node.js environment (Electron, Tauri, etc.)
    // Not available in React Native mobile environment
    return false;
  }

  /**
   * Disconnect from Discord
   */
  async disconnect() {
    this.settings.enabled = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    await this.persist();
  }

  /**
   * Get current presence (for debugging)
   */
  getCurrentPresence(): DiscordPresence | null {
    return this.buildPresence();
  }
}

export const discordService = new DiscordService();