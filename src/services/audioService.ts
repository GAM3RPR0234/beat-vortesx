import { Audio, InterruptionModeIOS, InterruptionModeAndroid, AVPlaybackStatus } from 'expo-av';
import { Platform } from 'react-native';
import { Track } from '@/store/playerStore';
import { usePlayerStore } from '@/store/playerStore';
import { readMetadataFromFile } from './metadataService';

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'error';

interface AudioServiceCallbacks {
  onPlaybackStateChange?: (state: PlaybackState) => void;
  onProgressUpdate?: (progress: number, duration: number) => void;
  onTrackEnd?: () => void;
  onPreviousTrack?: () => void;
  onError?: (error: Error) => void;
  onTrackChange?: (track: Track) => void;
}

interface NowPlayingInfo {
  title: string;
  artist: string;
  album: string;
  artwork: string;
  duration: number;
  elapsedTime: number;
  speed: number;
}

type MediaPlaybackState = 'playing' | 'paused' | 'stopped' | 'buffering';

interface MediaSessionInterface {
  updateNowPlaying(info: NowPlayingInfo): void;
  updatePlaybackState(state: MediaPlaybackState, elapsedTime: number, speed: number): void;
  reset(): void;
  onRemotePlay(callback: () => void): void;
  onRemotePause(callback: () => void): void;
  onRemoteStop(callback: () => void): void;
  onRemoteNextTrack(callback: () => void): void;
  onRemotePreviousTrack(callback: () => void): void;
  onRemoteSeek(callback: (position: number) => void): void;
}

class AudioService {
  private sound: Audio.Sound | null = null;
  private nextSound: Audio.Sound | null = null; // For gapless playback
  private currentTrack: Track | null = null;
  private nextTrack: Track | null = null;
  private callbacks: AudioServiceCallbacks = {};
  private playbackState: PlaybackState = 'idle';
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;
  private volume = 1;
  private pendingSeek: number | null = null;
  private crossfadeDuration = 0;
  private playbackRate = 1.0;
  private pitchShift = 0;
  private replayGainEnabled = false;
  private gaplessEnabled = true;
  private isTransitioning = false;
  private mediaSession: MediaSessionInterface | null = null;
  private mediaSessionInitialized = false;
  private currentProgress = 0;
  private currentDuration = 0;

  async initialize() {
    if (this.isInitialized) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('Audio initialization failed:', error);
    }
  }

  setCallbacks(callbacks: AudioServiceCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private setPlaybackState(state: PlaybackState) {
    this.playbackState = state;
    this.callbacks.onPlaybackStateChange?.(state);
  }

  // Audio feature setters (called from player store)
  setCrossfadeDuration(duration: number) {
    this.crossfadeDuration = Math.max(0, Math.min(12000, duration));
  }

  setPlaybackRate(rate: number) {
    this.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    if (this.sound) {
      this.sound.setRateAsync(this.playbackRate, this.pitchShift !== 0).catch(console.error);
    }
  }

  setPitchShift(semitones: number) {
    this.pitchShift = Math.max(-12, Math.min(12, semitones));
    if (this.sound) {
      this.sound.setRateAsync(this.playbackRate, this.pitchShift !== 0).catch(console.error);
    }
  }

  setReplayGainEnabled(enabled: boolean) {
    this.replayGainEnabled = enabled;
    // Volume adjustment would be applied per-track based on ReplayGain metadata
  }

  setGaplessEnabled(enabled: boolean) {
    this.gaplessEnabled = enabled;
  }

  // Calculate ReplayGain adjustment for a track
  private async getReplayGainAdjustment(track: Track): Promise<number> {
    if (!this.replayGainEnabled) return 0;

    // Try to read ReplayGain tags from local file if it's a downloaded track
    if (track.downloadPath) {
      try {
        const metadata = await readMetadataFromFile(track.downloadPath);
        if (metadata?.replayGainTrackGain !== undefined) {
          // Use track gain if available, fallback to album gain
          return metadata.replayGainTrackGain;
        }
        if (metadata?.replayGainAlbumGain !== undefined) {
          return metadata.replayGainAlbumGain;
        }
      } catch (error) {
        console.warn('Failed to read ReplayGain metadata:', error);
      }
    }

    // For streamed tracks, we could fetch from a metadata service
    // For now, return 0 (no adjustment)
    return 0;
  }

  async loadTrack(track: Track) {
    if (!track.url) {
      console.warn('Track has no URL, cannot play');
      this.setPlaybackState('error');
      return false;
    }

    try {
      this.setPlaybackState('loading');

      // Preload next track for gapless playback
      if (this.gaplessEnabled && this.nextTrack && this.nextTrack.url) {
        await this.preloadNextTrack(this.nextTrack);
      }

      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      this.currentTrack = track;
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        {
          shouldPlay: false,
          volume: this.volume,
          rate: this.playbackRate,
        },
        this.onPlaybackStatusUpdate.bind(this)
      );

      this.sound = sound;

      // Apply pitch shift if needed
      if (this.pitchShift !== 0) {
        await this.sound.setRateAsync(this.playbackRate, false).catch(console.error);
      }

      // Apply ReplayGain volume adjustment
      const rgAdjustment = await this.getReplayGainAdjustment(track);
      if (rgAdjustment !== 0) {
        await this.sound.setVolumeAsync(this.volume * Math.pow(10, rgAdjustment / 20)).catch(console.error);
      }

      if (this.pendingSeek !== null) {
        await this.sound.setPositionAsync(this.pendingSeek * 1000);
        this.pendingSeek = null;
      }

      this.updateNowPlayingInfo(track);
      this.callbacks.onTrackChange?.(track);
      this.setPlaybackState('paused');
      return true;
    } catch (error) {
      console.error('Failed to load track:', error);
      this.setPlaybackState('error');
      this.callbacks.onError?.(error as Error);
      return false;
    }
  }

  // Preload next track for gapless playback
  private async preloadNextTrack(track: Track) {
    if (!track.url || this.nextSound) return;

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        {
          shouldPlay: false,
          volume: 0, // Start muted
          rate: this.playbackRate,
        },
        () => {} // No callbacks for preloaded sound
      );
      this.nextSound = sound;
    } catch (error) {
      console.warn('Failed to preload next track:', error);
      this.nextSound = null;
    }
  }

  async play() {
    if (!this.sound) return false;

    try {
      // Handle crossfade from previous track if needed
      if (this.crossfadeDuration > 0 && this.nextSound) {
        await this.performCrossfade();
      }

      await this.sound.playAsync();
      this.startProgressTracking();

      // Update MediaSession playback state
      if (this.mediaSession && this.currentTrack) {
        this.mediaSession.updatePlaybackState('playing', this.currentProgress, this.playbackRate);
      }

      return true;
    } catch (error) {
      console.error('Play failed:', error);
      this.setPlaybackState('error');
      return false;
    }
  }

  // Perform crossfade between current and next track
  private async performCrossfade() {
    if (!this.sound || !this.nextSound || !this.nextTrack) return;

    this.isTransitioning = true;
    const duration = this.crossfadeDuration;
    const steps = 20;
    const stepTime = duration / steps;

    // Fade out current, fade in next
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const currentVol = this.volume * (1 - progress);
      const nextVol = this.volume * progress;

      await Promise.all([
        this.sound?.setVolumeAsync(currentVol).catch(() => {}),
        this.nextSound?.setVolumeAsync(nextVol).catch(() => {}),
      ]);

      if (i < steps) {
        await new Promise(resolve => setTimeout(resolve, stepTime));
      }
    }

    // Swap sounds
    const oldSound = this.sound;
    this.sound = this.nextSound;
    this.nextSound = null;
    this.currentTrack = this.nextTrack;
    this.nextTrack = null;

    // Clean up old sound
    try {
      await oldSound?.stopAsync();
      await oldSound?.unloadAsync();
    } catch (error) {
      console.warn('Error cleaning up old sound:', error);
    }

    // Resume progress tracking with new sound
    this.startProgressTracking();
    this.isTransitioning = false;
    this.callbacks.onTrackChange?.(this.currentTrack!);
  }

  async pause() {
    if (!this.sound) return;

    try {
      await this.sound.pauseAsync();
      this.stopProgressTracking();

      // Update MediaSession playback state
      if (this.mediaSession && this.currentTrack) {
        this.mediaSession.updatePlaybackState('paused', this.currentProgress, this.playbackRate);
      }
    } catch (error) {
      console.error('Pause failed:', error);
    }
  }

  async seek(position: number) {
    if (!this.sound) {
      this.pendingSeek = position;
      return;
    }

    try {
      await this.sound.setPositionAsync(position * 1000);
    } catch (error) {
      console.error('Seek failed:', error);
    }
  }

  async setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.sound && this.currentTrack) {
      const rgAdjustment = await this.getReplayGainAdjustment(this.currentTrack);
      const adjustedVolume = rgAdjustment !== 0
        ? this.volume * Math.pow(10, rgAdjustment / 20)
        : this.volume;
      await this.sound.setVolumeAsync(adjustedVolume);
    } else if (this.sound) {
      await this.sound.setVolumeAsync(this.volume);
    }
  }

  async stop() {
    this.stopProgressTracking();
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (error) {
        console.error('Stop failed:', error);
      }
      this.sound = null;
    }
    if (this.nextSound) {
      try {
        await this.nextSound.unloadAsync();
      } catch (error) {
        console.error('Next sound cleanup failed:', error);
      }
      this.nextSound = null;
    }
    this.currentTrack = null;
    this.nextTrack = null;
    this.setPlaybackState('idle');

    // Reset MediaSession
    if (this.mediaSession) {
      this.mediaSession.updatePlaybackState('stopped', 0, 1.0);
      this.mediaSession.reset();
    }
  }

  getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  getVolume(): number {
    return this.volume;
  }

  getCrossfadeDuration(): number {
    return this.crossfadeDuration;
  }

  getPlaybackRate(): number {
    return this.playbackRate;
  }

  getPitchShift(): number {
    return this.pitchShift;
  }

  private onPlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (!status.isLoaded) {
      if (status.error) {
        this.setPlaybackState('error');
        this.callbacks.onError?.(new Error(status.error));
      }
      return;
    }

    if (status.didJustFinish && !status.isLooping) {
      this.stopProgressTracking();
      this.setPlaybackState('paused');
      this.callbacks.onTrackEnd?.();
      return;
    }

    if (status.isPlaying) {
      this.setPlaybackState('playing');
    } else if (status.isBuffering) {
      this.setPlaybackState('buffering');
    } else {
      this.setPlaybackState('paused');
    }

    const progress = status.positionMillis / 1000;
    const duration = (status.durationMillis ?? 0) / 1000;

    // Update progress tracking for MediaSession
    this.currentProgress = progress;
    this.currentDuration = duration;

    if (duration > 0) {
      this.callbacks.onProgressUpdate?.(progress, duration);

      // Update MediaSession now playing info with current progress
      if (this.mediaSession && this.currentTrack) {
        this.mediaSession.updateNowPlaying({
          title: this.currentTrack.title,
          artist: this.currentTrack.artist,
          album: this.currentTrack.album,
          artwork: this.currentTrack.artwork,
          duration: duration,
          elapsedTime: progress,
          speed: this.playbackRate,
        });
      }

      // Preload next track when nearing end for gapless playback
      if (this.gaplessEnabled && !this.nextSound && this.nextTrack && duration - progress < 10) {
        this.preloadNextTrack(this.nextTrack);
      }
    }
  }

  private startProgressTracking() {
    this.stopProgressTracking();
    this.progressInterval = setInterval(async () => {
      if (this.sound && !this.isTransitioning) {
        try {
          const status = await this.sound.getStatusAsync();
          if (status.isLoaded && !status.isBuffering) {
            const progress = status.positionMillis / 1000;
            const duration = (status.durationMillis ?? 0) / 1000;
            if (duration > 0) {
              this.callbacks.onProgressUpdate?.(progress, duration);

              // Update MediaSession with current progress
              if (this.mediaSession && this.currentTrack) {
                this.mediaSession.updateNowPlaying({
                  title: this.currentTrack.title,
                  artist: this.currentTrack.artist,
                  album: this.currentTrack.album,
                  artwork: this.currentTrack.artwork,
                  duration: duration,
                  elapsedTime: progress,
                  speed: this.playbackRate,
                });
              }
            }
          }
        } catch (error) {
          console.error('Progress tracking error:', error);
        }
      }
    }, 500);
  }

  private stopProgressTracking() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private async initializeMediaSession() {
    if (this.mediaSessionInitialized || Platform.OS === 'web') return;

    try {
      const { MediaSession } = await import('react-native-media-session');
      this.mediaSession = MediaSession;
      this.mediaSessionInitialized = true;

      // Set up remote control handlers
      this.mediaSession.onRemotePlay(() => {
        this.play();
      });

      this.mediaSession.onRemotePause(() => {
        this.pause();
      });

      this.mediaSession.onRemoteStop(() => {
        this.stop();
      });

      this.mediaSession.onRemoteNextTrack(() => {
        this.callbacks.onTrackEnd?.();
      });

      this.mediaSession.onRemotePreviousTrack(() => {
        // Call previous track from queue via player store callback
        this.callbacks.onPreviousTrack?.();
      });

      this.mediaSession.onRemoteSeek((position: number) => {
        this.seek(position);
      });

      console.log('MediaSession initialized');
    } catch (error) {
      console.warn('MediaSession not available:', error);
      this.mediaSessionInitialized = false;
    }
  }

  private updateNowPlayingInfo(track: Track) {
    if (Platform.OS === 'web') return;

    // Update progress tracking
    this.currentDuration = track.duration;

    // Initialize MediaSession if not already done
    if (!this.mediaSessionInitialized) {
      this.initializeMediaSession();
    }

    // Update MediaSession now playing info
    if (this.mediaSession && this.currentTrack) {
      const info: NowPlayingInfo = {
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: track.artwork,
        duration: track.duration,
        elapsedTime: this.currentProgress,
        speed: this.playbackRate,
      };
      this.mediaSession.updateNowPlaying(info);
    }

    console.log('Now playing:', track.title, '-', track.artist);
  }

  // Set next track for gapless/crossfade preparation
  setNextTrack(track: Track | null) {
    this.nextTrack = track;
    if (track && this.gaplessEnabled) {
      this.preloadNextTrack(track);
    }
  }

  async playNext(queue: Track[], currentIndex: number, repeatMode: 'off' | 'all' | 'one', isShuffle: boolean): Promise<Track | null> {
    if (queue.length === 0) return null;

    let nextIndex: number;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') nextIndex = 0;
        else return null;
      }
    }

    const nextTrack = queue[nextIndex];

    // Prepare next track for gapless/crossfade
    this.setNextTrack(nextTrack);

    const success = await this.loadTrack(nextTrack);
    if (success) {
      await this.play();
      return nextTrack;
    }
    return null;
  }

  async playPrevious(queue: Track[], currentIndex: number, progress: number): Promise<Track | null> {
    if (queue.length === 0) return null;

    if (progress > 3) {
      await this.seek(0);
      return queue[currentIndex];
    }

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = queue.length - 1;

    const prevTrack = queue[prevIndex];
    this.setNextTrack(prevTrack);

    const success = await this.loadTrack(prevTrack);
    if (success) {
      await this.play();
      return prevTrack;
    }
    return null;
  }

  async cleanup() {
    this.stopProgressTracking();
    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
      this.sound = null;
    }
    if (this.nextSound) {
      try {
        await this.nextSound.unloadAsync();
      } catch (error) {
        console.error('Next sound cleanup error:', error);
      }
      this.nextSound = null;
    }
    this.currentTrack = null;
    this.nextTrack = null;
    this.isInitialized = false;
  }
}

export const audioService = new AudioService();

export const useAudioService = () => {
  const {
    currentTrack,
    queue,
    currentIndex,
    isShuffle,
    repeatMode,
    progress,
    play,
    pause,
    next,
    previous,
    seek,
    setVolume,
    togglePlay
  } = usePlayerStore();

  return {
    audioService,
    currentTrack,
    queue,
    currentIndex,
    isShuffle,
    repeatMode,
    progress,
    play,
    pause,
    next,
    previous,
    seek,
    setVolume,
    togglePlay,
  };
};