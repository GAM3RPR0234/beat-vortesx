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

class RecentlyPlayedWidgetReceiver : AppWidgetProvider() {

    private val SHARED_PREFS_NAME = "com.andylivesxss.beatvortex.widgetdata"
    private val WIDGET_DATA_KEY = "widgetdata"
    private val DATA_KEY_RECENTLY_PLAYED = "@beat_vortex_widget_recently_played"
    private val SERVICE_PREFS_NAME = "beat_vortex_widget_recently_played_service"

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            "com.andylivesxss.beatvortex.WIDGET_RECENT_PLAY" -> {
                val trackId = intent.getStringExtra("track_id") ?: ""
                val actionIntent = Intent(context, MainActivity::class.java).apply {
                    action = "com.andylivesxss.beatvortex.PLAY_TRACK"
                    putExtra("track_id", trackId)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(actionIntent)
            }
            "com.andylivesxss.beatvortex.WIDGET_UPDATE",
            AppWidgetManager.ACTION_APPWIDGET_UPDATE -> {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, RecentlyPlayedWidgetReceiver::class.java)
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
        val tracksJson = extractTracksJson(widgetDataJson)

        // Store tracks JSON for RemoteViewsService
        val servicePrefs = context.getSharedPreferences(SERVICE_PREFS_NAME, Context.MODE_PRIVATE)
        servicePrefs.edit().putString("recent_tracks", tracksJson).apply()

        val views = RemoteViews(context.packageName, R.layout.recently_played_widget_layout)

        // Set up the list view adapter
        val intent = Intent(context, RecentTracksRemoteViewsService::class.java)
        views.setRemoteAdapter(R.id.widget_recent_list, intent)

        // Open app on click
        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val openAppPendingIntent = PendingIntent.getActivity(context, 0, openAppIntent, PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_recent_header, openAppPendingIntent)

        // Empty view
        views.setEmptyView(R.id.widget_recent_list, R.id.widget_recent_empty)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun extractTracksJson(json: String): String {
        return try {
            val element = JsonParser.parseString(json)
            if (element.isJsonObject) {
                val obj = element.asJsonObject
                // Check if data is nested under dataKey
                if (obj.has(DATA_KEY_RECENTLY_PLAYED) && obj.get(DATA_KEY_RECENTLY_PLAYED).isJsonObject) {
                    val nested = obj.get(DATA_KEY_RECENTLY_PLAYED).asJsonObject
                    // Try multiple keys for tracks array
                    val keys = listOf("tracks", "recentTracks", "recent_tracks", "widget_recently_played_tracks")
                    for (key in keys) {
                        if (nested.has(key)) {
                            return Gson().toJson(nested.get(key))
                        }
                    }
                    // If nested object is the tracks array itself
                    if (nested.entrySet().isEmpty()) {
                        return "[]"
                    }
                    return Gson().toJson(nested)
                } else {
                    // Try multiple keys for tracks array at root level
                    val keys = listOf("tracks", "recentTracks", "recent_tracks", "widget_recently_played_tracks", "recentlyPlayedTracks")
                    for (key in keys) {
                        if (obj.has(key)) {
                            return Gson().toJson(obj.get(key))
                        }
                    }
                    return "[]"
                }
            } else {
                "[]"
            }
        } catch (e: Exception) {
            "[]"
        }
    }

    fun updateRecentTracks(context: Context, tracksJson: String) {
        val prefs = context.getSharedPreferences(SHARED_PREFS_NAME, Context.MODE_PRIVATE)
        val widgetDataJson = prefs.getString(WIDGET_DATA_KEY, "{}") ?: "{}"
        val rootObj = try {
            JsonParser.parseString(widgetDataJson).asJsonObject
        } catch (e: Exception) {
            JsonObject()
        }

        val recentlyPlayedObj = JsonObject()
        recentlyPlayedObj.add("tracks", JsonParser.parseString(tracksJson))

        rootObj.add(DATA_KEY_RECENTLY_PLAYED, recentlyPlayedObj)

        prefs.edit().putString(WIDGET_DATA_KEY, Gson().toJson(rootObj)).apply()

        val appWidgetManager = AppWidgetManager.getInstance(context)
        val componentName = ComponentName(context, RecentlyPlayedWidgetReceiver::class.java)
        val ids = appWidgetManager.getAppWidgetIds(componentName)
        appWidgetManager.notifyAppWidgetViewDataChanged(ids, R.id.widget_recent_list)
    }
}