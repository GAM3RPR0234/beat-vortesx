# Auditoría Completa: BEAT VORTEX vs MetroList

**Fecha:** 2026-11-08  
**Versión BEAT VORTEX:** 1.0.0 (React Native/Expo SDK 51)  
**Versión MetroList:** Maintenance mode (Kotlin/Jetpack Compose)  

---

## 1. DIAGNÓSTICO DE BEAT VORTEX

### Estado General
BEAT VORTEX es una aplicación de música **completamente funcional y madura** construida con React Native + Expo, con arquitectura moderna, TypeScript strict mode, y una base de código limpia y bien estructurada. La app ya incluye características avanzadas de IA (Smart Queue, EQ Adaptativo, Motor de Letras LRC) que **superan** a MetroList en varios aspectos técnicos.

### Fortalezas Principales
| Área | Evaluación |
|------|------------|
| **Arquitectura** | ✅ Excelente - Singleton services, Zustand stores, navegación bien separada |
| **UI/UX** | ✅ Cyberpunk/Glassmorphism único - Animaciones Reanimated 2 fluidas |
| **Reproducción** | ✅ expo-av robusto - Background audio, queue navigation, callbacks completos |
| **IA (Vortex AI Core)** | ✅ **Superior a MetroList** - Smart Queue (coseno + Camelot), EQ adaptativo (70+ géneros), LRC Engine con traducción y "Lyric Explain" |
| **Catálogo musical** | ✅ TheAudioDB + Jamendo paralelos - Deduplicación, scoring de relevancia, caché 10min |
| **Descargas** | ✅ Cola resumible (3 concurrentes), metadatos ID3v2.4, guardado en MediaLibrary |
| **Ecualizador** | ✅ 9 bandas (60Hz-16kHz), PanResponder drag, FFT visualization, presets IA |
| **Letras** | ✅ Parser LRC completo (línea + palabra), LRCLIB + caché 7 días, traducción offline, explicación IA |
| **Persistencia** | ✅ AsyncStorage en todos los stores - Theme, Player, Downloads, EQ, Lyrics |
| **TypeScript** | ✅ 0 errores - Strict mode, tipos bien definidos |

### Áreas de Mejora Identificadas
1. **Catálogo**: Solo TheAudioDB + Jamendo (MetroList usa YouTube Music/InnerTube - catálogo masivo)
2. **Sync cuenta**: Sin login/sync de cuenta (MetroList sincroniza con YouTube Music)
3. **Social**: Sin "Listen Together", Last.fm, Discord Rich Presence
4. **Video**: Sin reproducción de videos musicales / Picture-in-Picture
5. **Android Auto / CarPlay**: No implementado
6. **Widgets**: Sin widget de pantalla de inicio
7. **Pitch/Tempo control**: No implementado (MetroList sí tiene)
8. **Crossfade**: No implementado (MetroList sí tiene)
9. **Podcasts**: No implementado
10. **Importar playlists**: Solo UI placeholder (M3U/YouTube)

---

## 2. LISTA DE CARACTERÍSTICAS ACTUALES DE BEAT VORTEX

### Core Playback
- [x] Reproducción audio (expo-av) con background mode
- [x] Queue management (play next/previous, shuffle, repeat modes)
- [x] MiniPlayer persistente + PlayerScreen modal full-screen
- [x] Controles: play/pause, prev/next, shuffle, repeat (off/one/all), seek
- [x] Control de volumen + normalización (ReplayGain placeholder)
- [x] Sleep timer (off/15/30/60 min)
- [x] Saltar silencios (placeholder)

### Library Management
- [x] Biblioteca tabbed: Tracks / Albums / Artists / Playlists / Explore
- [x] Búsqueda en tiempo real en biblioteca (musicCatalogService)
- [x] Explore: géneros, playlists destacadas, nuevos lanzamientos
- [x] TrackCard, AlbumCard, PlaylistCard components reutilizables
- [x] Playlists locales (UI + store, falta persistencia completa)

### Search & Discovery
- [x] SearchScreen con sugerencias (recientes, tendencias, categorías)
- [x] Resultados por tipo: tracks, albums, artists, playlists
- [x] Botones de descarga en resultados
- [x] Catálogo: TheAudioDB (gratis) + Jamendo (gratis) en paralelo
- [x] Deduplicación por título+artista
- [x] Scoring de relevancia heurístico
- [x] Caché 10 minutos
- [x] Trending por género (synthwave, cyberpunk, retrowave)
- [x] Recomendaciones basadas en track semilla

### AI Module (Vortex AI Core) - **DIFERENCIADOR CLAVE**
- [x] **Smart Queue**: Cosine similarity + Camelot wheel harmonic mixing + BPM matching + genre clustering
- [x] **Modos**: Radio (alta similitud), Mix (balanceado), Discovery (baja similitud)
- [x] **Adaptive EQ**: 70+ genre presets mapeados, IA recommendation con confidence scoring
- [x] **Interpolación suave**: 300ms transitions entre presets
- [x] **LRC Lyrics Engine**: Parser completo (synced + word-level), LRCLIB fetch, caché 7 días
- [x] **Traducción offline**: Diccionario en-es/es-en + template fallback
- [x] **Lyric Explain**: Long-press → modal con explicación IA contextual (genre, artist, keywords)
- [x] **Persistencia**: AsyncStorage para traducciones, explicaciones, preferencias EQ

### Equalizer
- [x] 9 bandas: 60, 170, 310, 600, 1k, 3k, 6k, 12k, 16k Hz
- [x] PanResponder drag para ajustar bandas
- [x] FFT visualization bars (real-time via Web Audio API)
- [x] 8 builtin presets + "IA Adaptativo"
- [x] User presets (crear/guardar/eliminar)
- [x] AI mode: auto-switch por género detectado
- [x] Preferencias por género persistidas

### Downloads & Offline
- [x] DownloadService: cola resumible, max 3 concurrentes
- [x] Progreso en tiempo real, pause/resume/cancel/retry
- [x] Metadatos ID3v2.4 writing (TIT2, TPE1, TALB, TDRC, TCON, TRCK, APIC)
- [x] Artwork embebido extracción
- [x] Guardado en MediaLibrary (galería del sistema)
- [x] Solo WiFi option
- [x] Calidad: 320kbps / FLAC selector
- [x] Historial de descargas completadas

### UI/Theme System
- [x] Cyberpunk theme: COLORS.gradientNeon (#00d4ff, #b84dff, #ff2d75)
- [x] Glassmorphism: BlurView + LinearGradient overlays
- [x] Dark mode only (nativo cyberpunk)
- [x] Dynamic colors from artwork (PlayerScreen)
- [x] Reanimated 2: shared values, spring/timing, interpolations
- [x] SplashScreen animado (2.5s: fade, scale, glow, tagline)
- [x] Componentes reutilizables: Section, PlaylistCard, TrackCard, AlbumCard

### Settings & Configuration
- [x] Perfil usuario (avatar, badges: Offline First, Privacidad Total, Sin Servidores)
- [x] Apariencia: Dark mode forced, Dynamic Colors Engine, Animations toggle
- [x] Reproducción: Background, Normalize, Skip Silence, Lyrics, Sleep Timer
- [x] Descargas: Calidad, Solo WiFi, Gestionar archivos, Limpiar caché
- [x] IA: Smart Queue, Adaptive EQ, Lyric Translator, Import Playlists
- [x] Legal: Términos, Privacidad, GitHub, About
- [x] Danger Zone: Reset settings

### Navigation
- [x] Bottom Tabs: Home, Search, Library, Downloads
- [x] Stack: Main → Player (modal), Equalizer (modal), Settings (push)
- [x] Header customization per screen

---

## 3. CARACTERÍSTICAS DE METROLIST QUE FALTAN EN BEAT VORTEX

### Catálogo Musical Masivo (Crítico)
| Feature | MetroList | BEAT VORTEX | Gap |
|---------|-----------|-------------|-----|
| **YouTube Music / InnerTube API** | ✅ Catálogo completo YTM (100M+) | ❌ Solo TheAudioDB + Jamendo (~1M) | **MAYOR** |
| **NewPipe Extractor** | ✅ Fallback extractor | ❌ | Alto |
| **zemer-cipher / PoToken** | ✅ Cipher deobfuscation | ❌ | Alto |
| **Music videos streaming** | ✅ | ❌ | Alto |
| **Podcasts** | ✅ | ❌ | Medio |

### Sincronización de Cuenta
| Feature | MetroList | BEAT VORTEX | Gap |
|---------|-----------|-------------|-----|
| **YouTube Music login** | ✅ OAuth/cookie sync | ❌ | **MAYOR** |
| **Sync library** | ✅ Songs, artists, albums, playlists | ❌ Solo local | **MAYOR** |
| **Import playlists (YT Music)** | ✅ | ❌ Solo UI placeholder | Alto |

### Social & Compartido
| Feature | MetroList | BEAT VORTEX | Gap |
|---------|-----------|-------------|-----|
| **Listen Together (metroserver)** | ✅ Real-time co-listening | ❌ | Medio |
| **Last.fm scrobbling** | ✅ | ❌ | Medio |
| **Discord Rich Presence** | ✅ | ❌ | Bajo |

### Controles de Audio Avanzados
| Feature | MetroList | BEAT VORTEX | Gap |
|---------|-----------|-------------|-----|
| **Crossfade** | ✅ | ❌ | Medio |
| **Tempo control** | ✅ (0.5x - 2.0x) | ❌ | Medio |
| **Pitch control** | ✅ | ❌ | Bajo |
| **Audio normalization** | ✅ | Placeholder only | Medio |

### Platform & Integración
| Feature | MetroList | BEAT VORTEX | Gap |
|---------|-----------|-------------|-----|
| **Android Auto** | ✅ | ❌ | Medio |
| **Picture-in-Picture (video)** | ✅ | ❌ (no video) | Alto* |
| **Home screen widget** | ✅ | ❌ | Medio |
| **Shazam integration (MusicRecognizer)** | ✅ | ❌ | Bajo |

### Temas & Personalización
| Feature | MetroList | BEAT VORTEX | Gap |
|---------|-----------|-------------|-----|
| **Light / Dark / Black / Dynamic** | ✅ 4 modos | ❌ Solo Dark cyberpunk | Medio |
| **Material You / Dynamic Color** | ✅ 19 preset palettes | ❌ | Medio |
| **Dynamic color from artwork** | ✅ | ✅ (PlayerScreen) | - |

### Estado del Proyecto
- **MetroList**: **Maintenance mode** - solo bug fixes, sin features nuevas
- **BEAT VORTEX**: **Activo** - arquitectura extensible, IA propia superior

---

## 4. ANÁLISIS DE COMPATIBILIDAD Y VIABILIDAD

### Factibilidad Técnica por Categoría

| Categoría | Viabilidad | Esfuerzo | Riesgo | Comentario |
|-----------|------------|----------|--------|------------|
| **InnerTube API / YT Music** | 🟡 Media | Muy Alto | 🔴 Legal/ToS | Requiere reverse engineering, PoToken, cipher. Riesgo legal alto. |
| **NewPipe Extractor port** | 🟢 Alta | Alto | 🟡 | Existe librería Java/Kotlin; port a TS/JS posible pero complejo. |
| **Account Sync (YTM)** | 🔴 Baja | Muy Alto | 🔴 Legal | Requiere auth flow oficial o cookie scraping. |
| **Listen Together** | 🟢 Alta | Medio | 🟢 | Requiere backend (metroserver) o WebRTC mesh. |
| **Last.fm Scrobbling** | 🟢 Alta | Bajo | 🟢 | API pública bien documentada. |
| **Discord Rich Presence** | 🟢 Alta | Bajo | 🟢 | SDK disponible para RN. |
| **Crossfade** | 🟢 Alta | Medio | 🟢 | expo-av no nativo; requiere dual player o AudioContext. |
| **Tempo/Pitch Control** | 🟡 Media | Medio | 🟢 | expo-av no expone; requiere AudioContext + Web Audio API. |
| **Android Auto / CarPlay** | 🟡 Media | Alto | 🟡 | Requiere native modules; Expo no soporta directo. |
| **Picture-in-Picture** | 🟡 Media | Alto | 🟡 | Solo video; BEAT VORTEX no tiene video. |
| **Home Widget** | 🟢 Alta | Medio | 🟢 | react-native-widgetkit o native module. |
| **Shazam Integration** | 🟡 Media | Alto | 🟡 | No API pública oficial; MusicRecognizer es private. |
| **Light/Black/Dynamic Themes** | 🟢 Alta | Bajo | 🟢 | Ya existe theme system; solo extender paletas. |
| **Material You / Dynamic Color** | 🟢 Alta | Bajo | 🟢 | expo-system-ui + react-native-dynamic-color. |
| **M3U/Playlist Import** | 🟢 Alta | Medio | 🟢 | Parser M3U simple; YouTube playlist import requiere API. |
| **Podcasts** | 🟢 Alta | Medio | 🟢 | RSS parsing + player adaptation. |

### Análisis Estratégico Clave

**BEAT VORTEX YA SUPERA A METROLIST EN:**
1. **IA Musical Propia** - Smart Queue con análisis armónico (Camelot), EQ adaptativo 70+ géneros, Lyric Explain
2. **Arquitectura Offline-First** - Sin servidores, sin tracking, privacidad total
3. **Multiplataforma Real** - iOS + Android + Web (Expo) vs Solo Android
4. **Tech Stack Moderno** - React Native + TypeScript + Reanimated 2 vs Kotlin/Compose
5. **Extensibilidad** - Servicios singleton bien definidos, stores tipados

**NO VALE LA PENA REPLICAR (Riesgo Legal/ToS):**
- InnerTube API / YouTube Music scraping
- NewPipe Extractor / zember-cipher / PoToken
- YouTube Music account login/sync

**SÍ VALE LA PENA IMPLEMENTAR (Alto valor, bajo riesgo):**
- Last.fm scrobbling
- Discord Rich Presence
- Crossfade (via AudioContext)
- Tempo/Pitch (via Web Audio API)
- Temas Light/Black/Dynamic + Material You
- Widget pantalla inicio
- Importar playlists M3U + YouTube (via API pública)
- Listen Together (propio backend WebRTC)
- Android Auto / CarPlay (expo-carplay / native modules)
- Podcasts (RSS + player adaptation)
- Shazam-like (acrcloud / audd.io APIs públicas)

---

## 5. ARCHIVOS QUE REQUIEREN MODIFICACIÓN

### Nuevos Archivos a Crear

| Archivo | Propósito | Prioridad |
|---------|-----------|-----------|
| `src/services/lastfmService.ts` | Last.fm scrobbling + now playing | 🟢 Alta |
| `src/services/discordService.ts` | Discord Rich Presence | 🟢 Alta |
| `src/services/crossfadeService.ts` | Crossfade management (dual player / AudioContext) | 🟡 Media |
| `src/services/tempoPitchService.ts` | Tempo/Pitch control via Web Audio API | 🟡 Media |
| `src/services/widgetService.ts` | Home screen widget (react-native-widgetkit) | 🟡 Media |
| `src/services/playlistImportService.ts` | M3U parser + YouTube playlist import | 🟡 Media |
| `src/services/podcastService.ts` | RSS parsing + podcast player | 🟡 Media |
| `src/services/listenTogetherService.ts` | WebRTC mesh / metroserver client | 🔴 Baja |
| `src/services/shazamService.ts` | ACRCloud / Audd.io integration | 🔴 Baja |
| `src/services/androidAutoService.ts` | Android Auto / CarPlay integration | 🔴 Baja |
| `src/screens/PodcastsScreen.tsx` | Podcasts library UI | 🟡 Media |
| `src/screens/ListenTogetherScreen.tsx` | Social listening UI | 🔴 Baja |
| `src/components/common/ThemeSelector.tsx` | Selector de temas extendido | 🟢 Alta |
| `src/components/common/CrossfadeControl.tsx` | UI control crossfade | 🟡 Media |
| `src/components/common/TempoPitchControl.tsx` | UI tempo/pitch | 🟡 Media |

### Archivos Existentes a Modificar

| Archivo | Cambios Requeridos | Prioridad |
|---------|-------------------|-----------|
| `src/constants/theme.ts` | Agregar temas Light, Black, Dynamic, Material You palettes (19 presets) | 🟢 Alta |
| `src/store/themeStore.ts` | Extender para múltiples temas, dynamic color, persistir preferencias | 🟢 Alta |
| `src/store/playerStore.ts` | Agregar: crossfade, tempo, pitch, lastfm, discord, listenTogether state | 🟢 Alta |
| `src/services/audioService.ts` | Integrar crossfade, tempo/pitch, dual player para gapless | 🟡 Media |
| `src/services/equalizerService.ts` | Ya completo - solo conectar tempo/pitch si afecta EQ | 🟢 Baja |
| `src/screens/SettingsScreen.tsx` | Agregar secciones: Social, Audio Avanzado, Temas Extendidos, Widgets | 🟢 Alta |
| `src/screens/PlayerScreen.tsx` | Agregar controles tempo/pitch, crossfade toggle, discord status | 🟡 Media |
| `src/screens/EqualizerScreen.tsx` | Ya excelente - solo tema selector integration | 🟢 Baja |
| `src/screens/LibraryScreen.tsx` | Agregar tab Podcasts, import playlist button | 🟡 Media |
| `src/navigation/AppNavigator.tsx` | Agregar PodcastsScreen, ListenTogetherScreen, ThemeSettings | 🟡 Media |
| `src/App.tsx` | Inicializar Discord, Last.fm, Widget services | 🟢 Alta |
| `app.json` / `app.config.js` | Permisos Android Auto, CarPlay, widget, foreground service | 🟡 Media |
| `eas.json` | Build configs para native modules | 🟡 Media |

---

## 6. ARQUITECTURA RECOMENDADA

### Principios Rectores
1. **Preservar lo existente** - Zero breaking changes, arquitectura actual sólida
2. **Capas de abstracción** - Servicios nuevos siguen patrón singleton existente
3. **Feature flags** - Cada feature nueva detrás de flag en SettingsStore
4. **Offline-first** - Sin dependencias de backend obligatorias
5. **Legal compliance** - No scraping ToS-violating APIs

### Estructura de Servicios Propuesta

```
src/services/
├── audioService.ts          ← EXISTE (extender: crossfade, tempo/pitch)
├── downloadService.ts       ← EXISTE
├── metadataService.ts       ← EXISTE
├── lyricsService.ts         ← EXISTE (completo)
├── equalizerService.ts      ← EXISTE (completo)
├── aiService.ts             ← EXISTE (completo)
├── musicCatalogService.ts   ← EXISTE (extender: podcasts)
├── lastfmService.ts         ← NUEVO
├── discordService.ts        ← NUEVO
├── crossfadeService.ts      ← NUEVO
├── tempoPitchService.ts     ← NUEVO
├── widgetService.ts         ← NUEVO
├── playlistImportService.ts ← NUEVO
├── podcastService.ts        ← NUEVO
├── listenTogetherService.ts ← NUEVO (opcional)
├── shazamService.ts         ← NUEVO (opcional)
├── androidAutoService.ts    ← NUEVO (opcional)
└── index.ts                 ← Barrel export
```

### Store Extensions

```typescript
// themeStore.ts - EXTENDER
interface ThemeState {
  // ... existing
  themeMode: 'cyberpunk' | 'light' | 'black' | 'dynamic' | 'material-you';
  dynamicColorPalette: number; // 0-18 para Material You presets
  useArtworkColors: boolean;
  setThemeMode: (mode: ThemeState['themeMode']) => void;
  setDynamicColorPalette: (index: number) => void;
}

// playerStore.ts - EXTENDER
interface PlayerState {
  // ... existing
  crossfadeEnabled: boolean;
  crossfadeDuration: number; // ms
  tempo: number; // 0.5 - 2.0
  pitch: number; // -12 - +12 semitones
  lastfmEnabled: boolean;
  lastfmSessionKey: string | null;
  discordEnabled: boolean;
  listenTogetherEnabled: boolean;
  listenTogetherSessionId: string | null;
  // actions...
}
```

### Navigation Extension

```
AppNavigator (Stack)
├── Main (Tabs)
│   ├── Home
│   ├── Search
│   ├── Library
│   │   └── Podcasts (nuevo tab)
│   └── Downloads
├── Player (Modal)
├── Equalizer (Modal)
├── Settings (Push)
│   ├── ThemeSettings (Push) - NUEVO
│   ├── AudioAdvancedSettings (Push) - NUEVO
│   └── SocialSettings (Push) - NUEVO
├── PodcastsScreen (Push) - NUEVO
├── ListenTogetherScreen (Modal) - NUEVO
└── ThemeSelectorModal (Modal) - NUEVO
```

---

## 7. PLAN DE IMPLEMENTACIÓN PRIORIZADO

### FASE 1: Fundamentos UI/Tema (Semana 1-2) 🟢 **ALTA PRIORIDAD - BAJO RIESGO**
**Objetivo:** Paridad visual con MetroList + identidad propia

| Task | Archivos | Esfuerzo |
|------|----------|----------|
| 1.1 Extender theme.ts: Light, Black, Dynamic, Material You (19 paletas) | `theme.ts`, `themeStore.ts` | 2 días |
| 1.2 ThemeSelector component + modal | `ThemeSelector.tsx`, `SettingsScreen.tsx` | 1 día |
| 1.3 Dynamic color from artwork (ya en PlayerScreen → global) | `themeStore.ts`, `App.tsx` | 1 día |
| 1.4 Persistir preferencias tema extendido | `themeStore.ts` | 0.5 días |
| 1.5 Testing visual en iOS/Android | - | 1 día |

**Entregable:** 5 modos de tema, 19 paletas Material You, selector UI

---

### FASE 2: Audio Avanzado (Semana 2-4) 🟡 **MEDIA PRIORIDAD - VALOR ALTO**
**Objetivo:** Crossfade, Tempo, Pitch - features "pro" de MetroList

| Task | Archivos | Esfuerzo |
|------|----------|----------|
| 2.1 CrossfadeService: dual expo-av players + gapless | `crossfadeService.ts`, `audioService.ts` | 3 días |
| 2.2 Tempo/Pitch via Web Audio AudioContext | `tempoPitchService.ts`, `audioService.ts` | 3 días |
| 2.3 UI Controls en PlayerScreen + Settings | `PlayerScreen.tsx`, `SettingsScreen.tsx` | 2 días |
| 2.4 Persistir preferencias en playerStore | `playerStore.ts` | 0.5 días |
| 2.5 Testing: crossfade 1-12s, tempo 0.5-2.0x, pitch ±12 | - | 1 día |

**Entregable:** Crossfade configurable, tempo/pitch real-time, UI integrada

---

### FASE 3: Integraciones Sociales (Semana 4-5) 🟢 **ALTA PRIORIDAD - BAJO ESFUERZO**
**Objetivo:** Last.fm + Discord - features sociales estándar

| Task | Archivos | Esfuerzo |
|------|----------|----------|
| 3.1 Last.fm Service: scrobble, now playing, auth | `lastfmService.ts`, `playerStore.ts`, `App.tsx` | 2 días |
| 3.2 Discord Rich Presence: playing, paused, track info | `discordService.ts`, `playerStore.ts`, `App.tsx` | 1.5 días |
| 3.3 Settings UI: conectar cuentas, toggles | `SettingsScreen.tsx` (nueva sección Social) | 1 día |
| 3.4 Testing con cuentas reales | - | 0.5 días |

**Entregable:** Scrobbling automático, Discord presence, auth OAuth flow

---

### FASE 4: Widgets & Platform (Semana 5-7) 🟡 **MEDIA PRIORIDAD - ESFUERZO MEDIO**
**Objetivo:** Home widget + Android Auto prep

| Task | Archivos | Esfuerzo |
|------|----------|----------|
| 4.1 Widget Service: react-native-widgetkit setup | `widgetService.ts`, `app.json`, native config | 3 días |
| 4.2 Widget UI: mini player, play/pause, next, artwork | Widget extension (Swift/Kotlin) | 2 días |
| 4.3 Android Auto / CarPlay research + stub | `androidAutoService.ts`, `app.json` | 2 días |
| 4.4 Testing en dispositivo físico | - | 1 día |

**Entregable:** Widget funcional, base para Auto/CarPlay

---

### FASE 5: Playlist Import & Podcasts (Semana 7-9) 🟡 **MEDIA PRIORIDAD**
**Objetivo:** Import M3U/YouTube + Podcasts library

| Task | Archivos | Esfuerzo |
|------|----------|----------|
| 5.1 M3U Parser robusto (EXTINF, EXTGRP, etc.) | `playlistImportService.ts` | 2 días |
| 5.2 YouTube Playlist Import (API pública / Invidious) | `playlistImportService.ts` | 2 días |
| 5.3 UI: Import button en Library + modal | `LibraryScreen.tsx`, `SettingsScreen.tsx` | 1 día |
| 5.4 PodcastService: RSS parsing, episodes, playback | `podcastService.ts` | 3 días |
| 5.5 PodcastsScreen: library, subscriptions, episodes | `PodcastsScreen.tsx`, `AppNavigator.tsx` | 2 días |
| 5.6 Player adaptation: podcast vs music metadata | `PlayerScreen.tsx`, `audioService.ts` | 1 día |

**Entregable:** Import playlists funcional, Podcasts tab completo

---

### FASE 6: Listen Together & Avanzado (Semana 9-12) 🔴 **BAJA PRIORIDAD - OPCIONAL**
**Objetivo:** Features diferenciadoras sociales

| Task | Archivos | Esfuerzo |
|------|----------|----------|
| 6.1 WebRTC mesh signaling (simple-peer / peerjs) | `listenTogetherService.ts` | 4 días |
| 6.2 Sync playback state: position, track, play/pause | `listenTogetherService.ts`, `audioService.ts` | 2 días |
| 6.3 ListenTogetherScreen: invite, code, participants | `ListenTogetherScreen.tsx` | 2 días |
| 6.4 Shazam-like: ACRCloud / Audd.io integration | `shazamService.ts` | 2 días |
| 6.5 Testing multi-dispositivo | - | 1 día |

**Entregable:** Escucha sincronizada en tiempo real, reconocimiento musical

---

### RESUMEN DE CRONOGRAMA

| Fase | Semanas | Prioridad | Features Entregadas |
|------|---------|-----------|---------------------|
| 1. Temas | 1-2 | 🟢 Alta | 5 modos, 19 paletas, dynamic color |
| 2. Audio Pro | 2-4 | 🟡 Media | Crossfade, Tempo, Pitch |
| 3. Social | 4-5 | 🟢 Alta | Last.fm, Discord |
| 4. Widget/Platform | 5-7 | 🟡 Media | Home widget, Auto prep |
| 5. Import/Podcasts | 7-9 | 🟡 Media | M3U/YT import, Podcasts tab |
| 6. Listen Together | 9-12 | 🔴 Baja | Sync listening, Shazam |

**Total estimado: 12 semanas (3 meses) para implementación completa**

---

## DECISIÓN ESTRATÉGICA CLAVE

> **NO implementar:** YouTube Music/InnerTube scraping, NewPipe Extractor, zember-cipher, PoToken, YTM account sync
> 
> **RAZÓN:** Riesgo legal alto (ToS violation), maintenance burden alto, MetroList ya en maintenance mode.
> 
> **ENFOQUE:** Diferenciarse con **IA musical propia superior**, **privacidad total offline-first**, **multiplataforma real (iOS/Android/Web)**, **arquitectura extensible**.

---

## PRÓXIMOS PASOS

1. **Revisión y aprobación** de este plan por el usuario
2. **Fase 1** puede comenzar inmediatamente (solo theme.ts, themeStore.ts, SettingsScreen.tsx)
3. **Fase 2** requiere investigación Web Audio API en React Native (expo-av limitations)
4. **Fase 3** es quick-win alto valor
5. **Fases 4-6** evaluar según feedback usuario y prioridades de negocio

---

*Documento generado tras auditoría completa de código fuente BEAT VORTEX (src/) y análisis de MetroList (GitHub, Web, DeepWiki, AndroidPolice review).*