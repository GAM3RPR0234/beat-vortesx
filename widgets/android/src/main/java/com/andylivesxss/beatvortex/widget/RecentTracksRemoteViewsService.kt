package com.andylivesxss.beatvortex.widget

import android.appwidget.RemoteViews
import android.appwidget.RemoteViewsService
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

class RecentTracksRemoteViewsService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return RecentTracksRemoteViewsFactory(this.applicationContext)
    }
}

class RecentTracksRemoteViewsFactory(private val context: Context) : RemoteViewsService.RemoteViewsFactory {

    private val SERVICE_PREFS_NAME = "beat_vortex_widget_recently_played_service"
    private val KEY_TRACKS = "recent_tracks"
    private var tracks: List<Track> = emptyList()

    private data class Track(
        val id: String,
        val title: String,
        val artist: String,
        val artwork: String?
    )

    override fun onCreate() {
        loadTracks()
    }

    override fun onDataSetChanged() {
        loadTracks()
    }

    override fun onDestroy() {
        tracks = emptyList()
    }

    override fun getCount(): Int = tracks.size

    override fun getViewAt(position: Int): RemoteViews? {
        if (position >= tracks.size) return null

        val track = tracks[position]
        val views = RemoteViews(context.packageName, R.layout.recent_track_item)

        views.setTextViewText(R.id.recent_item_title, track.title)
        views.setTextViewText(R.id.recent_item_artist, track.artist)
        track.artwork?.let {
            // Note: RemoteViews can't load images from arbitrary URLs directly
            // In production, you'd use a library like Glide with RemoteViews or download the image first
        }

        // Set click intent
        val fillInIntent = Intent().apply {
            putExtra("track_id", track.id)
        }
        views.setOnClickFillInIntent(R.id.recent_item_container, fillInIntent)

        return views
    }

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = position.toLong()

    override fun hasStableIds(): Boolean = true

    override fun getLoadingView(): RemoteViews? = RemoteViews(context.packageName, R.layout.recent_track_loading)

    private fun loadTracks() {
        val prefs = context.getSharedPreferences(SERVICE_PREFS_NAME, Context.MODE_PRIVATE)
        val tracksJson = prefs.getString(KEY_TRACKS, "[]") ?: "[]"
        try {
            tracks = Gson().fromJson(tracksJson, object : TypeToken<List<Track>>() {}.type) ?: emptyList()
        } catch (e: Exception) {
            tracks = emptyList()
        }
    }
}