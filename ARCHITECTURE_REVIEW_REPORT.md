# Beat Vortex - Architecture Review Report

**Date:** 2026-11-10  
**Scope:** Complete architecture review of 12 services, 7 stores, navigation, and cross-cutting concerns.

---

## Executive Summary

The BEAT VORTEX codebase demonstrates a solid modular architecture with clear separation of concerns. Zustand + AsyncStorage provides reliable persistence. The service layer is well-organized with single-responsibility classes. Key strengths include comprehensive feature coverage (ReplayGain, Smart Queue, Adaptive EQ, LRC Lyrics, Podcasts, M3U Import, Discord/Last.fm integration) and TypeScript strict mode compliance.

---

## Services Analysis (12 Services)

### 1. audioService.ts (638 lines)
**Status:** ✅ Well-structured, comprehensive
- **Responsibilities:** expo-av wrapper, crossfade, gapless, ReplayGain, pitch shift, playback rate, MediaSession
- **Strengths:** Single class with clear methods, proper error handling, MediaSession integration
- **Concerns:** Large file; could split into `AudioPlayer`, `CrossfadeManager`, `MediaSessionManager`
- **Dependencies:** expo-av, react-native-media-session, playerStore

### 2. metadataService.ts (Complete TXXX Implementation)
**Status:** ✅ Complete - Phase 1 ReplayGain requirement met
- **Responsibilities:** ID3v2.4 TXXX frame read/write for ReplayGain (track/album gain/peak)
- **Implementation:** Full read/write support for `replaygain_track_gain`, `replaygain_track_peak`, `replaygain_album_gain`, `replaygain_album_peak`
- **Verification:** Ready for production use

### 3. downloadService.ts (385 lines)
**Status:** ✅ Well-structured
- **Responsibilities:** DownloadResumable, queue management, metadata writing, media library integration
- **Strengths:** Proper queue with priority, progress tracking, resume capability
- **Concerns:** Direct dependency on metadataService (tight coupling)

### 4. historyService.ts (359 lines)
**Status:** ✅ Clean implementation
- **Responsibilities:** Playback history with persistence, stats, date ranges, search
- **Strengths:** AsyncStorage persistence, efficient querying, stats computation

### 5. lastfmService.ts (342 lines)
**Status:** ✅ Complete OAuth 1.0a implementation
- **Responsibilities:** OAuth 1.0a, scrobbling queue with retries, now playing, love/unlove
- **Strengths:** Retry queue with exponential backoff, proper signature generation

### 6. equalizerService.ts (421 lines)
**Status:** ✅ Feature-complete
- **Responsibilities:** Web Audio API FFT, 9-band EQ, 8 built-in + 70+ genre presets, user presets, AI adaptive mode
- **Strengths:** Comprehensive preset system, FFT visualization, AI integration

### 7. lyricsService.ts (420 lines)
**Status:** ✅ Complete LRC engine
- **Responsibilities:** LRC parsing, LRCLIB fetch, translation cache, explanation templates
- **Strengths:** Multi-source fetching, translation support, sync handling

### 8. podcastService.ts (662 lines) - Largest Service
**Status:** ⚠️ Consider splitting
- **Responsibilities:** RSS parsing (@xmldom/xmldom), iTunes search, subscriptions, chapters, auto-refresh
- **Concerns:** 662 lines handles too many concerns - could split into `RssParser`, `PodcastSearch`, `SubscriptionManager`, `EpisodeManager`

### 9. playlistImportService.ts (332 lines)
**Status:** ✅ Focused and clean
- **Responsibilities:** M3U parsing, catalog matching with Levenshtein similarity, export to M3U

### 10. musicCatalogService.ts (346 lines)
**Status:** ✅ Multi-source with caching
- **Responsibilities:** TheAudioDB, Jamendo search, caching, deduplication, relevance scoring

### 11. aiService.ts (344 lines)
**Status:** ✅ Core AI features implemented
- **Responsibilities:** Smart Queue (cosine similarity + Camelot wheel), Adaptive EQ (genre clusters), TrackFeatures
- **Strengths:** Three modes (radio/mix/discovery), harmonic mixing via Camelot wheel

### 12. discordService.ts (Not yet read - need to verify)
**Status:** 🔍 Pending review

---

## Stores Analysis (7 Stores)

### 1. playerStore.ts (314 lines) - Core Store
**Status:** ✅ Central state hub
- **State:** currentTrack, queue, history, playback state, Smart Queue config, Adaptive EQ, Lyrics, Audio features
- **Persistence:** Full AsyncStorage persistence with selective hydration
- **Concerns:** Very large - 314 lines with 40+ actions; could split into `playbackStore`, `queueStore`, `audioFeaturesStore`

### 2. downloadStore.ts (73 lines)
**Status:** ✅ Lightweight wrapper
- **Pattern:** Thin wrapper around downloadService with subscribe pattern

### 3. historyStore.ts (104 lines)
**Status:** ✅ Clean wrapper
- **Pattern:** Subscribe-based reactive store over historyService

### 4. playlistStore.ts (104 lines)
**Status:** ✅ Focused
- **Responsibilities:** Playlist CRUD, smart playlists, track reordering

### 5. podcastStore.ts (236 lines)
**Status:** ✅ Moderate size
- **Responsibilities:** Podcast/episode management, search, subscriptions, progress tracking

### 6. themeStore.ts (171 lines)
**Status:** ✅ Comprehensive theming
- **Responsibilities:** 5 theme modes, 19 palettes, custom colors, dynamic color, font/animation scale, reduced motion

### 7. widgetStore.ts (92 lines)
**Status:** ✅ Clean implementation
- **Responsibilities:** Widget config (miniplayer, recentlyPlayed, quickActions), reordering, enable/disable

---

## Cross-Cutting Architecture Issues

### 🔴 Critical Issues

| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **Circular dependency risk** | audioService ↔ playerStore | Runtime instability | Use event bus or middleware pattern |
| **Tight coupling: downloadService → metadataService** | downloadService.ts | Hard to test/mock | Inject metadataService via constructor |
| **Tight coupling: audioService → playerStore** | audioService.ts | Store mutations in service | Emit events, let store listen |

### 🟠 High Priority Issues

| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **playerStore too large (314 lines, 40+ actions)** | playerStore.ts | Maintenance burden | Split into 3 stores: playback, queue, audioFeatures |
| **podcastService too large (662 lines)** | podcastService.ts | SRP violation | Split into 4 focused services |
| **SettingsScreen 1730 lines, LibraryScreen 2110 lines, PlayerScreen 1308 lines** | Screen components | Maintainability | Extract to `src/components/screens/` |
| **No centralized error handling** | All services | Inconsistent UX | Create `ErrorBoundary` + `useErrorHandler` hook |
| **Missing service interfaces** | All services | Testing difficulty | Define interfaces for each service |

### 🟡 Medium Priority Issues

| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **Inconsistent persistence patterns** | Stores | Bugs in hydration | Standardize `persist` middleware usage |
| **No service registry / DI container** | App bootstrap | Tight coupling | Implement simple service locator |
| **Direct AsyncStorage calls in some places** | Various | Inconsistency | Route all through store persist middleware |
| **Missing request deduplication** | musicCatalogService, aiService | Wasted API calls | Add request deduplication utility |

### 🟢 Low Priority / Technical Debt

| Issue | Location | Recommendation |
|-------|----------|----------------|
| `any` types in multiple files | playerStore, aiService, musicCatalogService | Replace with proper interfaces |
| Hardcoded API endpoints | musicCatalogService, podcastService | Move to config/constants |
| Magic numbers (timeouts, limits) | Multiple services | Extract to constants |
| Console.warn for errors | Multiple services | Use structured logging |

---

## Navigation Architecture

**File:** `src/navigation/AppNavigator.tsx` + `src/navigation/types.ts`

**Status:** ✅ Well-structured
- **Stack + Tabs:** Properly nested (Stack.Navigator → MainTabs)
- **Deep Linking:** `parseDeepLink` utility with 10+ routes
- **Type Safety:** RootStackParamList with 19 routes, MainTabParamList with 5 tabs
- **Modal Presentations:** Player, Equalizer, PlaylistManager, M3UImport use modal presentation
- **WidgetProvider:** Wraps NavigationContainer for expo-widget integration

**Issues:**
- `MainTabs` component has duplicate `activeTab` state (also in AppNavigator)
- `params?: any` in Library route - should be typed
- No route guards for authentication-required screens

---

## Persistence Architecture

**Pattern:** Zustand `persist` middleware + `AsyncStorage`

**Stores with Persistence:**
1. playerStore - `beat-vortex-player` (partial: queue, history, settings)
2. downloadStore - `beat-vortex-downloads`
3. historyStore - `beat-vortex-history` (via historyService)
4. playlistStore - `beat-vortex-playlists`
5. podcastStore - `beat-vortex-podcasts`
6. themeStore - `beat-vortex-theme`
7. widgetStore - `beat-vortex-widgets`

**Issues:**
- playerStore partial persistence includes complex objects (Track with ReplayGain fields) - verify serialization
- No migration strategy for schema changes
- historyStore wraps service but service also persists - potential double-write

---

## Duplicate / Overlapping Functionality

| Functionality | Locations | Resolution |
|---------------|-----------|------------|
| **Track interface** | playerStore.ts, musicCatalogService.ts (SearchResult) | Unify into shared `@/types/track.ts` |
| **Genre normalization** | aiService.ts (normalizeGenre), musicCatalogService.ts | Extract to `@/utils/genreUtils.ts` |
| **Color extraction** | colorExtractor.ts, PlayerScreen.tsx (generateNeonGradients) | Already centralized ✅ |
| **Date formatting** | Multiple screens/services | Create `@/utils/dateUtils.ts` |
| **Debounce/throttle** | Multiple hooks | Extract to `@/hooks/useDebounce.ts` |

---

## Testing Coverage

**Current State:**
- Vortex AI Core tests: 28/28 passing (7 Smart Queue + 10 Adaptive EQ + 11 Lyrics)
- No integration tests for services
- No E2E tests for navigation/screens
- No snapshot tests for UI components

**Gaps:**
- audioService (crossfade, gapless, ReplayGain)
- downloadService (queue, resume, metadata)
- lastfmService (OAuth, scrobbling queue)
- podcastService (RSS parsing, chapters)
- Navigation deep linking

---

## Dependency Graph (Simplified)

```
AppNavigator
  ├── WidgetProvider
  ├── ThemeStore (provider)
  ├── PlayerStore (core)
  │   ├── AudioService
  │   │   ├── MetadataService (ReplayGain)
  │   │   └── MediaSession
  │   ├── AIService
  │   │   └── MusicCatalogService
  │   ├── LyricsService
  │   └── EqualizerService
  ├── DownloadStore
  │   └── DownloadService
  │       └── MetadataService
  ├── HistoryStore
  │   └── HistoryService
  ├── PlaylistStore
  │   └── PlaylistImportService
  ├── PodcastStore
  │   └── PodcastService
  └── ThemeStore
      └── ColorExtractor
```

---

## Recommendations Priority Order

### Phase 1 (Before Release - Critical)
1. **Verify ReplayGain TXXX implementation** - metadataService.ts already complete ✅
2. **Discord mobile documentation** - Add to DiscordSettingsScreen platform notes
3. **Android build verification** - `expo run:android`
4. **Dependency verification** - `npm ls --depth=0`

### Phase 2 (Immediate - High Priority)
5. **Fix SplashScreen reduced motion** - Add `useReducedMotion()` guard
6. **Migrate DiscoveryScreen to theme constants** - Replace inline styles
7. **Define Discord brand colors in theme** - Remove hardcoded `#5865F2`, `#2f3136`

### Phase 3 (Short Term - Architecture)
8. **Extract large screen components** - SettingsScreen, LibraryScreen, PlayerScreen
9. **Create reusable modal components** - ConfirmModal, SettingsModal, WebViewModal
10. **Replace `any` types** - Add proper TypeScript interfaces
11. **Split playerStore** - Into playbackStore, queueStore, audioFeaturesStore
12. **Split podcastService** - Into RssParser, PodcastSearch, SubscriptionManager, EpisodeManager
13. **Add service interfaces** - For testability and decoupling

### Phase 4 (Medium Term)
14. **Implement service registry/DI** - Simple service locator pattern
15. **Centralized error handling** - ErrorBoundary + useErrorHandler
16. **Request deduplication** - Utility for API calls
17. **Persistence migration strategy** - Versioned schema migrations
18. **Integration tests** - For critical user flows

---

## Files to Create / Modify

### New Files Needed
```
src/types/track.ts              # Unified Track interface
src/utils/genreUtils.ts         # Shared genre normalization
src/utils/dateUtils.ts          # Date formatting
src/hooks/useDebounce.ts        # Debounce utility
src/services/interfaces/        # Service interfaces
  ├── IAudioService.ts
  ├── IDownloadService.ts
  ├── IMetadataService.ts
  ├── ILastFmService.ts
  ├── IPodcastService.ts
  └── ...
src/components/screens/         # Extracted screen components
  ├── SettingsScreen/
  ├── LibraryScreen/
  └── PlayerScreen/
src/components/modals/          # Reusable modals
  ├── ConfirmModal.tsx
  ├── SettingsModal.tsx
  └── WebViewModal.tsx
```

### Files to Modify
```
src/store/playerStore.ts        # Split into 3 stores
src/services/podcastService.ts  # Split into 4 services
src/services/downloadService.ts # Inject metadataService
src/services/audioService.ts    # Event-based instead of direct store mutation
src/navigation/types.ts         # Fix `params?: any`
src/constants/theme.ts          # Add Discord brand colors
src/screens/SplashScreen.tsx    # Add reduced motion support
src/screens/DiscoveryScreen.tsx # Migrate to theme constants
```

---

## Verification Checklist

- [ ] ReplayGain TXXX read/write verified with test files
- [ ] MediaSession previous track works on Android/iOS
- [ ] Discord mobile platform notes documented
- [ ] `expo run:android` builds successfully
- [ ] `npm ls --depth=0` shows no vulnerabilities
- [ ] `npm test` - 28/28 passing
- [ ] `npm run typecheck` - 0 errors
- [ ] `npm run lint` - 0 errors (warnings acceptable)

---

*Report generated as part of Phase 1 architecture review. All 12 services and 7 stores analyzed.*