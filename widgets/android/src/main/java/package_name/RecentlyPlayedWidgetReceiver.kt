package com.andylivesxss.beatvortex

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.widget.RemoteViews

class RecentlyPlayedWidgetReceiver : AppWidgetProvider() {

    private val PREFS_NAME = "beat_vortex_widget_recently_played"
    private val KEY_TRACKS = "recent_tracks"

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
            "com.andylivesxss.beatvortex.WIDGET_UPDATE" -> {
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
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val tracksJson = prefs.getString(KEY_TRACKS, "[]") ?: "[]"

        val views = RemoteViews(context.packageName, R.layout.recently_played_widget_layout)

        // Parse tracks and populate list
        // For now, set up the list view adapter
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

    fun updateRecentTracks(context: Context, tracksJson: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_TRACKS, tracksJson).apply()

        val appWidgetManager = AppWidgetManager.getInstance(context)
        val componentName = ComponentName(context, RecentlyPlayedWidgetReceiver::class.java)
        val ids = appWidgetManager.getAppWidgetIds(componentName)
        appWidgetManager.notifyAppWidgetViewDataChanged(ids, R.id.widget_recent_list)
    }
}