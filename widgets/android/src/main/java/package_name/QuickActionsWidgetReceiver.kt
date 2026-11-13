package com.andylivesxss.beatvortex

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class QuickActionsWidgetReceiver : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            "com.andylivesxss.beatvortex.WIDGET_SHUFFLE" -> {
                val actionIntent = Intent(context, MainActivity::class.java).apply {
                    action = "com.andylivesxss.beatvortex.SHUFFLE"
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(actionIntent)
            }
            "com.andylivesxss.beatvortex.WIDGET_FAVORITES" -> {
                val actionIntent = Intent(context, MainActivity::class.java).apply {
                    action = "com.andylivesxss.beatvortex.FAVORITES"
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(actionIntent)
            }
            "com.andylivesxss.beatvortex.WIDGET_DOWNLOADS" -> {
                val actionIntent = Intent(context, MainActivity::class.java).apply {
                    action = "com.andylivesxss.beatvortex.DOWNLOADS"
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(actionIntent)
            }
            "com.andylivesxss.beatvortex.WIDGET_PLAY_PAUSE" -> {
                val actionIntent = Intent(context, MainActivity::class.java).apply {
                    action = "com.andylivesxss.beatvortex.PLAY_PAUSE"
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(actionIntent)
            }
            "com.andylivesxss.beatvortex.WIDGET_UPDATE" -> {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, QuickActionsWidgetReceiver::class.java)
                val ids = appWidgetManager.getAppWidgetIds(componentName)
                for (id in ids) {
                    updateWidget(context, appWidgetManager, id)
                }
            }
        }
    }

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.quick_actions_widget_layout)

        // Set click listeners for each action
        val actions = mapOf(
            R.id.widget_action_shuffle to "com.andylivesxss.beatvortex.WIDGET_SHUFFLE",
            R.id.widget_action_favorites to "com.andylivesxss.beatvortex.WIDGET_FAVORITES",
            R.id.widget_action_downloads to "com.andylivesxss.beatvortex.WIDGET_DOWNLOADS",
            R.id.widget_action_play_pause to "com.andylivesxss.beatvortex.WIDGET_PLAY_PAUSE"
        )

        actions.forEach { (viewId, action) ->
            val intent = Intent(context, QuickActionsWidgetReceiver::class.java).apply {
                this.action = action
            }
            val pendingIntent = PendingIntent.getBroadcast(context, viewId, intent, PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(viewId, pendingIntent)
        }

        // Open app on main area click
        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val openAppPendingIntent = PendingIntent.getActivity(context, 0, openAppIntent, PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_quick_main, openAppPendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}