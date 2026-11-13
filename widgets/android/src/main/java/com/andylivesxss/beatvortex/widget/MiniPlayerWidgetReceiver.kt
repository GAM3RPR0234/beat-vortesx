package com.andylivesxss.beatvortex.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.widget.RemoteViews
import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser

class MiniPlayerWidgetReceiver : AppWidgetProvider() {

    private val SHARED_PREFS_NAME = "com.andylivesxss.beatvortex.widgetdata"
    private val WIDGET_DATA_KEY = "widgetdata"
    private val DATA_KEY_MINI_PLAYER = "@beat_vortex_widget_miniplayer"

    // Try multiple key formats for robustness
    private val KEYS_TRACK_TITLE = listOf("miniPlayerTrackTitle", "trackTitle", "track_title", "widget_miniplayer_track_title")
    private val KEYS_TRACK_ARTIST = listOf("miniPlayerTrackArtist", "trackArtist", "track_artist", "widget_miniplayer_track_artist")
    private val KEYS_TRACK_ARTWORK = listOf("miniPlayerArtworkURL", "artworkURL", "artwork_url", "widget_miniplayer_artwork_url")
    private val KEYS_IS_PLAYING = listOf("miniPlayerIsPlaying", "isPlaying", "is_playing", "widget_miniplayer_is_playing")
    private val KEYS_PROGRESS = listOf("miniPlayerProgress", "progress", "widget_miniplayer_progress")
    private val KEYS_DURATION = listOf("miniPlayerDuration", "duration", "widget_miniplayer_duration")

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
            "com.andylivesxss.beatvortex.WIDGET_UPDATE",
            AppWidgetManager.ACTION_APPWIDGET_UPDATE -> {
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
        val prefs = context.getSharedPreferences(SHARED_PREFS_NAME, Context.MODE_PRIVATE)
        val widgetDataJson = prefs.getString(WIDGET_DATA_KEY, "{}") ?: "{}"
        val data = parseWidgetData(widgetDataJson)

        val views = RemoteViews(context.packageName, R.layout.miniplayer_widget_layout)

        // Set track info
        views.setTextViewText(R.id.widget_track_title, getString(data, KEYS_TRACK_TITLE, "No Track"))
        views.setTextViewText(R.id.widget_track_artist, getString(data, KEYS_TRACK_ARTIST, "Unknown Artist"))

        // Set play/pause button
        val isPlaying = getBoolean(data, KEYS_IS_PLAYING, false)
        views.setImageViewResource(R.id.widget_play_pause, if (isPlaying) R.drawable.ic_pause else R.drawable.ic_play)

        // Set progress
        val progress = getInt(data, KEYS_PROGRESS, 0)
        val duration = getInt(data, KEYS_DURATION, 0)
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

    private fun parseWidgetData(json: String): JsonObject {
        return try {
            val element = JsonParser.parseString(json)
            if (element.isJsonObject) {
                val obj = element.asJsonObject
                // Check if data is nested under dataKey
                if (obj.has(DATA_KEY_MINI_PLAYER) && obj.get(DATA_KEY_MINI_PLAYER).isJsonObject) {
                    obj.get(DATA_KEY_MINI_PLAYER).asJsonObject
                } else {
                    obj
                }
            } else {
                JsonObject()
            }
        } catch (e: Exception) {
            JsonObject()
        }
    }

    private fun getString(data: JsonObject, keys: List<String>, default: String): String {
        for (key in keys) {
            if (data.has(key) && !data.get(key).isJsonNull) {
                val value = data.get(key).asString
                if (value.isNotBlank()) return value
            }
        }
        return default
    }

    private fun getBoolean(data: JsonObject, keys: List<String>, default: Boolean): Boolean {
        for (key in keys) {
            if (data.has(key) && !data.get(key).isJsonNull) {
                return data.get(key).asBoolean
            }
        }
        return default
    }

    private fun getInt(data: JsonObject, keys: List<String>, default: Int): Int {
        for (key in keys) {
            if (data.has(key) && !data.get(key).isJsonNull) {
                return try {
                    data.get(key).asInt
                } catch (e: Exception) {
                    try {
                        data.get(key).asDouble.toInt()
                    } catch (e2: Exception) {
                        default
                    }
                }
            }
        }
        return default
    }

    // Kept for compatibility with direct calls from React Native if needed
    fun updateTrackInfo(context: Context, title: String, artist: String, artworkUri: String?, isPlaying: Boolean, progress: Int, duration: Int) {
        val prefs = context.getSharedPreferences(SHARED_PREFS_NAME, Context.MODE_PRIVATE)
        val widgetDataJson = prefs.getString(WIDGET_DATA_KEY, "{}") ?: "{}"
        val rootObj = try {
            JsonParser.parseString(widgetDataJson).asJsonObject
        } catch (e: Exception) {
            JsonObject()
        }

        val miniPlayerObj = JsonObject()
        miniPlayerObj.addProperty("miniPlayerTrackTitle", title)
        miniPlayerObj.addProperty("miniPlayerTrackArtist", artist)
        artworkUri?.let { miniPlayerObj.addProperty("miniPlayerArtworkURL", it) }
        miniPlayerObj.addProperty("miniPlayerIsPlaying", isPlaying)
        miniPlayerObj.addProperty("miniPlayerProgress", progress.toDouble())
        miniPlayerObj.addProperty("miniPlayerDuration", duration.toDouble())

        rootObj.add(DATA_KEY_MINI_PLAYER, miniPlayerObj)

        prefs.edit().putString(WIDGET_DATA_KEY, Gson().toJson(rootObj)).apply()

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