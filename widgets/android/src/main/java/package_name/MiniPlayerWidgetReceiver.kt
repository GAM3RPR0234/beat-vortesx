package com.andylivesxss.beatvortex

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.widget.RemoteViews

class MiniPlayerWidgetReceiver : AppWidgetProvider() {

    private val PREFS_NAME = "beat_vortex_widget_miniplayer"
    private val KEY_TRACK_TITLE = "track_title"
    private val KEY_TRACK_ARTIST = "track_artist"
    private val KEY_TRACK_ARTWORK = "track_artwork"
    private val KEY_IS_PLAYING = "is_playing"
    private val KEY_PROGRESS = "progress"
    private val KEY_DURATION = "duration"

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            "com.andylivesxss.beatvortex.WIDGET_PLAY_PAUSE" -> {
                val actionIntent = Intent(context, MainActivity::class.java).apply {
                    action = "com.andylivesxss.beatvortex.PLAY_PAUSE"
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(actionIntent)
            }
            "com.andylivesxss.beatvortex.WIDGET_PREVIOUS" -> {
                val actionIntent = Intent(context, MainActivity::class.java).apply {
                    action = "com.andylivesxss.beatvortex.PREVIOUS"
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(actionIntent)
            }
            "com.andylivesxss.beatvortex.WIDGET_NEXT" -> {
                val actionIntent = Intent(context, MainActivity::class.java).apply {
                    action = "com.andylivesxss.beatvortex.NEXT"
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(actionIntent)
            }
            "com.andylivesxss.beatvortex.WIDGET_UPDATE" -> {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, MiniPlayerWidgetReceiver::class.java)
                val ids = appWidgetManager.getAppWidgetIds(componentName)
                for (id in ids) {
                    updateWidget(context, appWidgetManager, id)
                }
            }
        }
    }

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        val views = RemoteViews(context.packageName, R.layout.miniplayer_widget_layout)

        // Set track info
        views.setTextViewText(R.id.widget_track_title, prefs.getString(KEY_TRACK_TITLE, "No Track") ?: "No Track")
        views.setTextViewText(R.id.widget_track_artist, prefs.getString(KEY_TRACK_ARTIST, "Unknown Artist") ?: "Unknown Artist")

        // Set play/pause button
        val isPlaying = prefs.getBoolean(KEY_IS_PLAYING, false)
        views.setImageViewResource(R.id.widget_play_pause, if (isPlaying) R.drawable.ic_pause else R.drawable.ic_play)

        // Set progress
        val progress = prefs.getInt(KEY_PROGRESS, 0)
        val duration = prefs.getInt(KEY_DURATION, 0)
        if (duration > 0) {
            views.setProgressBar(R.id.widget_progress, duration, progress, false)
            views.setTextViewText(R.id.widget_time, formatTime(progress) + " / " + formatTime(duration))
        } else {
            views.setProgressBar(R.id.widget_progress, 100, 0, false)
            views.setTextViewText(R.id.widget_time, "0:00 / 0:00")
        }

        // Set click listeners
        val playPauseIntent = Intent(context, MiniPlayerWidgetReceiver::class.java).apply {
            action = "com.andylivesxss.beatvortex.WIDGET_PLAY_PAUSE"
        }
        val playPausePendingIntent = PendingIntent.getBroadcast(context, 0, playPauseIntent, PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_play_pause, playPausePendingIntent)

        val previousIntent = Intent(context, MiniPlayerWidgetReceiver::class.java).apply {
            action = "com.andylivesxss.beatvortex.WIDGET_PREVIOUS"
        }
        val previousPendingIntent = PendingIntent.getBroadcast(context, 1, previousIntent, PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_previous, previousPendingIntent)

        val nextIntent = Intent(context, MiniPlayerWidgetReceiver::class.java).apply {
            action = "com.andylivesxss.beatvortex.WIDGET_NEXT"
        }
        val nextPendingIntent = PendingIntent.getBroadcast(context, 2, nextIntent, PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_next, nextPendingIntent)

        // Open app on main area click
        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val openAppPendingIntent = PendingIntent.getActivity(context, 3, openAppIntent, PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_main_area, openAppPendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    fun updateTrackInfo(context: Context, title: String, artist: String, artworkUri: String?, isPlaying: Boolean, progress: Int, duration: Int) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().apply {
            putString(KEY_TRACK_TITLE, title)
            putString(KEY_TRACK_ARTIST, artist)
            artworkUri?.let { putString(KEY_TRACK_ARTWORK, it) }
            putBoolean(KEY_IS_PLAYING, isPlaying)
            putInt(KEY_PROGRESS, progress)
            putInt(KEY_DURATION, duration)
            apply()
        }

        val appWidgetManager = AppWidgetManager.getInstance(context)
        val componentName = ComponentName(context, MiniPlayerWidgetReceiver::class.java)
        val ids = appWidgetManager.getAppWidgetIds(componentName)
        for (id in ids) {
            updateWidget(context, appWidgetManager, id)
        }
    }

    private fun formatTime(ms: Int): String {
        val seconds = ms / 1000
        val minutes = seconds / 60
        val remainingSeconds = seconds % 60
        return String.format("%d:%02d", minutes, remainingSeconds)
    }
}