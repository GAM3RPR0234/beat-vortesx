// BeatVortexWidgets.swift
// Beat Vortex iOS Widgets
//
// Created for Beat Vortex app
// Provides home screen widgets for MiniPlayer, Recently Played, and Quick Actions

import WidgetKit
import SwiftUI
import Intents

// MARK: - Data Models

struct TrackEntry: TimelineEntry {
    let date: Date
    let trackTitle: String
    let trackArtist: String
    let artworkURL: String?
    let isPlaying: Bool
    let progress: Double
    let duration: Double
}

struct RecentTrackEntry: TimelineEntry {
    let date: Date
    let tracks: [RecentTrack]
}

struct RecentTrack: Identifiable, Codable {
    let id: String
    let title: String
    let artist: String
    let artworkURL: String?
}

struct QuickActionEntry: TimelineEntry {
    let date: Date
}

// MARK: - Shared App Group
// Configure this in Xcode: Target → Signing & Capabilities → App Groups
// Add group: group.com.andylivesxss.beatvortex

let appGroupIdentifier = "group.com.andylivesxss.beatvortex"

// MARK: - UserDefaults Keys

enum WidgetKeys {
    static let miniPlayerTrackTitle = "widget_miniplayer_track_title"
    static let miniPlayerTrackArtist = "widget_miniplayer_track_artist"
    static let miniPlayerArtworkURL = "widget_miniplayer_artwork_url"
    static let miniPlayerIsPlaying = "widget_miniplayer_is_playing"
    static let miniPlayerProgress = "widget_miniplayer_progress"
    static let miniPlayerDuration = "widget_miniplayer_duration"

    static let recentTracks = "widget_recently_played_tracks"

    static let suiteName = appGroupIdentifier
}

// MARK: - MiniPlayer Widget

struct MiniPlayerProvider: TimelineProvider {
    func placeholder(in context: Context) -> TrackEntry {
        TrackEntry(
            date: Date(),
            trackTitle: "Track Title",
            trackArtist: "Artist Name",
            artworkURL: nil,
            isPlaying: false,
            progress: 0.3,
            duration: 225
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (TrackEntry) -> Void) {
        let entry = loadCurrentTrack()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TrackEntry>) -> Void) {
        let entry = loadCurrentTrack()
        // Update every 30 seconds when playing, every 5 minutes when paused
        let nextUpdate = entry.isPlaying ? Calendar.current.date(byAdding: .second, value: 30, to: Date())! : Calendar.current.date(byAdding: .minute, value: 5, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadCurrentTrack() -> TrackEntry {
        let defaults = UserDefaults(suiteName: WidgetKeys.suiteName)
        let title = defaults?.string(forKey: WidgetKeys.miniPlayerTrackTitle) ?? "No Track"
        let artist = defaults?.string(forKey: WidgetKeys.miniPlayerTrackArtist) ?? "Unknown Artist"
        let artworkURL = defaults?.string(forKey: WidgetKeys.miniPlayerArtworkURL)
        let isPlaying = defaults?.bool(forKey: WidgetKeys.miniPlayerIsPlaying) ?? false
        let progress = defaults?.double(forKey: WidgetKeys.miniPlayerProgress) ?? 0
        let duration = defaults?.double(forKey: WidgetKeys.miniPlayerDuration) ?? 0

        return TrackEntry(
            date: Date(),
            trackTitle: title,
            trackArtist: artist,
            artworkURL: artworkURL,
            isPlaying: isPlaying,
            progress: progress,
            duration: duration
        )
    }
}

struct MiniPlayerWidgetEntryView: View {
    var entry: TrackEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(Color(UIColor.systemBackground))
                .overlay(
                    ContainerRelativeShape()
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )

            switch family {
            case .systemSmall:
                MiniPlayerSmallView(entry: entry)
            case .systemMedium:
                MiniPlayerMediumView(entry: entry)
            case .systemLarge:
                MiniPlayerLargeView(entry: entry)
            default:
                MiniPlayerMediumView(entry: entry)
            }
        }
    }
}

struct MiniPlayerSmallView: View {
    let entry: TrackEntry

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.trackTitle)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                    Text(entry.trackArtist)
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
                Spacer()
            }

            ProgressView(value: entry.progress, total: entry.duration)
                .progressViewStyle(LinearProgressViewStyle(tint: Color(hex: "5865F2")))
                .frame(height: 2)

            HStack {
                Text(formatTime(entry.progress))
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundColor(.secondary)
                Spacer()
                Text(formatTime(entry.duration))
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundColor(.secondary)
            }

            HStack(spacing: 16) {
                Spacer()
                Button(intent: PlayPauseIntent()) {
                    Image(systemName: entry.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.primary)
                }
                .buttonStyle(.plain)
                Spacer()
            }
        }
        .padding(12)
    }
}

struct MiniPlayerMediumView: View {
    let entry: TrackEntry

    var body: some View {
        HStack(spacing: 12) {
            // Artwork
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.gray.opacity(0.3))
                .frame(width: 64, height: 64)
                .overlay(
                    Group {
                        if let urlString = entry.artworkURL, let url = URL(string: urlString) {
                            AsyncImage(url: url) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Image(systemName: "music.note")
                                    .font(.system(size: 24))
                                    .foregroundColor(.secondary)
                            }
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        } else {
                            Image(systemName: "music.note")
                                .font(.system(size: 24))
                                .foregroundColor(.secondary)
                        }
                    }
                )

            VStack(alignment: .leading, spacing: 6) {
                Text(entry.trackTitle)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.primary)
                    .lineLimit(1)
                Text(entry.trackArtist)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                    .lineLimit(1)

                ProgressView(value: entry.progress, total: entry.duration)
                    .progressViewStyle(LinearProgressViewStyle(tint: Color(hex: "5865F2")))
                    .frame(height: 3)

                HStack {
                    Text(formatTime(entry.progress))
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(formatTime(entry.duration))
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            VStack(spacing: 8) {
                Button(intent: PreviousIntent()) {
                    Image(systemName: "backward.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.primary)
                }
                .buttonStyle(.plain)

                Button(intent: PlayPauseIntent()) {
                    Image(systemName: entry.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 28))
                        .foregroundColor(Color(hex: "5865F2"))
                }
                .buttonStyle(.plain)

                Button(intent: NextIntent()) {
                    Image(systemName: "forward.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.primary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(16)
    }
}

struct MiniPlayerLargeView: View {
    let entry: TrackEntry

    var body: some View {
        HStack(spacing: 16) {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.gray.opacity(0.3))
                .frame(width: 100, height: 100)
                .overlay(
                    Group {
                        if let urlString = entry.artworkURL, let url = URL(string: urlString) {
                            AsyncImage(url: url) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Image(systemName: "music.note")
                                    .font(.system(size: 40))
                                    .foregroundColor(.secondary)
                            }
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        } else {
                            Image(systemName: "music.note")
                                .font(.system(size: 40))
                                .foregroundColor(.secondary)
                        }
                    }
                )

            VStack(alignment: .leading, spacing: 8) {
                Text(entry.trackTitle)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.primary)
                    .lineLimit(2)
                Text(entry.trackArtist)
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                    .lineLimit(1)

                ProgressView(value: entry.progress, total: entry.duration)
                    .progressViewStyle(LinearProgressViewStyle(tint: Color(hex: "5865F2")))
                    .frame(height: 4)

                HStack {
                    Text(formatTime(entry.progress))
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(formatTime(entry.duration))
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(.secondary)
                }

                HStack(spacing: 20) {
                    Button(intent: PreviousIntent()) {
                        Image(systemName: "backward.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.primary)
                    }
                    .buttonStyle(.plain)

                    Button(intent: PlayPauseIntent()) {
                        Image(systemName: entry.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 36))
                            .foregroundColor(Color(hex: "5865F2"))
                    }
                    .buttonStyle(.plain)

                    Button(intent: NextIntent()) {
                        Image(systemName: "forward.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.primary)
                    }
                    .buttonStyle(.plain)
                }
            }

            Spacer()
        }
        .padding(20)
    }
}

// MARK: - Recently Played Widget

struct RecentlyPlayedProvider: TimelineProvider {
    func placeholder(in context: Context) -> RecentTrackEntry {
        RecentTrackEntry(
            date: Date(),
            tracks: [
                RecentTrack(id: "1", title: "Track 1", artist: "Artist 1", artworkURL: nil),
                RecentTrack(id: "2", title: "Track 2", artist: "Artist 2", artworkURL: nil),
                RecentTrack(id: "3", title: "Track 3", artist: "Artist 3", artworkURL: nil),
            ]
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (RecentTrackEntry) -> Void) {
        let entry = loadRecentTracks()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RecentTrackEntry>) -> Void) {
        let entry = loadRecentTracks()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadRecentTracks() -> RecentTrackEntry {
        let defaults = UserDefaults(suiteName: WidgetKeys.suiteName)
        let tracksData = defaults?.data(forKey: WidgetKeys.recentTracks)

        var tracks: [RecentTrack] = []
        if let data = tracksData {
            tracks = (try? JSONDecoder().decode([RecentTrack].self, from: data)) ?? []
        }

        return RecentTrackEntry(date: Date(), tracks: tracks)
    }
}

struct RecentlyPlayedWidgetEntryView: View {
    var entry: RecentTrackEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(Color(UIColor.systemBackground))
                .overlay(
                    ContainerRelativeShape()
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )

            VStack(alignment: .leading, spacing: 12) {
                Text("Recently Played")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.primary)

                if entry.tracks.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "music.note.list")
                            .font(.system(size: 32))
                            .foregroundColor(.secondary)
                        Text("No recent tracks")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ForEach(entry.tracks.prefix(family == .systemLarge ? 5 : 3)) { track in
                        HStack(spacing: 12) {
                            RoundedRectangle(cornerRadius: 6)
                                .fill(Color.gray.opacity(0.3))
                                .frame(width: family == .systemLarge ? 56 : 44, height: family == .systemLarge ? 56 : 44)
                                .overlay(
                                    Group {
                                        if let urlString = track.artworkURL, let url = URL(string: urlString) {
                                            AsyncImage(url: url) { image in
                                                image.resizable().aspectRatio(contentMode: .fill)
                                            } placeholder: {
                                                Image(systemName: "music.note")
                                                    .foregroundColor(.secondary)
                                            }
                                            .clipShape(RoundedRectangle(cornerRadius: 6))
                                        } else {
                                            Image(systemName: "music.note")
                                                .foregroundColor(.secondary)
                                        }
                                    }
                                )

                            VStack(alignment: .leading, spacing: 2) {
                                Text(track.title)
                                    .font(.system(size: family == .systemLarge ? 14 : 12, weight: .semibold))
                                    .foregroundColor(.primary)
                                    .lineLimit(1)
                                Text(track.artist)
                                    .font(.system(size: family == .systemLarge ? 12 : 10))
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                            }

                            Spacer()
                        }
                    }
                }
            }
            .padding(16)
        }
    }
}

// MARK: - Quick Actions Widget

struct QuickActionsProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuickActionEntry {
        QuickActionEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (QuickActionEntry) -> Void) {
        completion(QuickActionEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QuickActionEntry>) -> Void) {
        let entry = QuickActionEntry(date: Date())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

struct QuickActionsWidgetEntryView: View {
    var entry: QuickActionEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(Color(UIColor.systemBackground))
                .overlay(
                    ContainerRelativeShape()
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )

            VStack(spacing: family == .systemSmall ? 8 : 12) {
                if family != .systemSmall {
                    Text("Quick Actions")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.primary)
                }

                if family == .systemSmall {
                    // Single row for small
                    HStack(spacing: 8) {
                        ActionButton(icon: "shuffle", label: "Shuffle", intent: ShuffleIntent())
                        ActionButton(icon: "heart", label: "Favs", intent: FavoritesIntent())
                    }
                    HStack(spacing: 8) {
                        ActionButton(icon: "arrow.down.circle", label: "DLs", intent: DownloadsIntent())
                        ActionButton(icon: "play.circle.fill", label: "Play", intent: PlayPauseIntent(), isPrimary: true)
                    }
                } else {
                    // 2x2 grid for medium/large
                    HStack(spacing: 12) {
                        ActionButton(icon: "shuffle", label: "Shuffle", intent: ShuffleIntent())
                        ActionButton(icon: "heart", label: "Favorites", intent: FavoritesIntent())
                    }
                    HStack(spacing: 12) {
                        ActionButton(icon: "arrow.down.circle", label: "Downloads", intent: DownloadsIntent())
                        ActionButton(icon: "play.circle.fill", label: "Play/Pause", intent: PlayPauseIntent(), isPrimary: true)
                    }
                }
            }
            .padding(16)
        }
    }
}

struct ActionButton<IntentType: AppIntent>: View {
    let icon: String
    let label: String
    let intent: IntentType
    var isPrimary: Bool = false

    var body: some View {
        Button(intent: intent) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: isPrimary ? 24 : 20))
                    .foregroundColor(isPrimary ? .white : .primary)
                Text(label)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(isPrimary ? .white : .primary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isPrimary ? Color(hex: "5865F2") : Color.gray.opacity(0.2))
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Intents

struct PlayPauseIntent: AppIntent {
    static var title: LocalizedStringResource = "Play/Pause"
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        return .result()
    }
}

struct PreviousIntent: AppIntent {
    static var title: LocalizedStringResource = "Previous Track"
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        return .result()
    }
}

struct NextIntent: AppIntent {
    static var title: LocalizedStringResource = "Next Track"
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        return .result()
    }
}

struct ShuffleIntent: AppIntent {
    static var title: LocalizedStringResource = "Shuffle"
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        return .result()
    }
}

struct FavoritesIntent: AppIntent {
    static var title: LocalizedStringResource = "Favorites"
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        return .result()
    }
}

struct DownloadsIntent: AppIntent {
    static var title: LocalizedStringResource = "Downloads"
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        return .result()
    }
}

// MARK: - Widget Configuration

@main
struct BeatVortexWidgets: WidgetBundle {
    var body: some Widget {
        MiniPlayerWidget()
        RecentlyPlayedWidget()
        QuickActionsWidget()
    }
}

struct MiniPlayerWidget: Widget {
    let kind: String = "MiniPlayerWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MiniPlayerProvider()) { entry in
            MiniPlayerWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("MiniPlayer")
        .description("Control playback from your home screen")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct RecentlyPlayedWidget: Widget {
    let kind: String = "RecentlyPlayedWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RecentlyPlayedProvider()) { entry in
            RecentlyPlayedWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Recently Played")
        .description("Quick access to your recent tracks")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

struct QuickActionsWidget: Widget {
    let kind: String = "QuickActionsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: QuickActionsProvider()) { entry in
            QuickActionsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Quick Actions")
        .description("Shuffle, favorites, downloads, play/pause")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Helpers

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

private func formatTime(_ seconds: Double) -> String {
    let mins = Int(seconds) / 60
    let secs = Int(seconds) % 60
    return String(format: "%d:%02d", mins, secs)
}