package com.zenstudy.focus;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

/**
 * User-started countdown completion without a foreground service.
 *
 * AlarmManager#setAndAllowWhileIdle is deliberately INEXACT. Doze/battery saver may
 * delay an end notification. The WebView timer retains the actual deadline in
 * zen_fortress_active_timer_v21 and reconciles the clock on next app opening.
 *
 * No SCHEDULE_EXACT_ALARM, USE_EXACT_ALARM or FOREGROUND_SERVICE permission.
 */
public final class FocusAlarmReceiver extends BroadcastReceiver {
    private static final String PREFS = "zen_native_timer_alarm_v21";
    private static final String FIRE = "com.deepfocus.study.TIMER_COMPLETE";
    private static final String CHANNEL_ACTIVE = "zen_ongoing_timer_channel";
    private static final String CHANNEL_DONE = "zen_completion_alarm_channel";
    private static final int REQUEST = 2201;
    private static final int ACTIVE_NOTIFICATION = 1001;
    private static final int DONE_NOTIFICATION = 2002;
    private static final long MAX_SECONDS = 86400L;

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static NotificationManager notifications(Context context) {
        return (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    }

    private static AlarmManager alarms(Context context) {
        return (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    }

    private static boolean canNotify(Context context) {
        return Build.VERSION.SDK_INT < 33 ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
    }

    private static String cleanTitle(Context context, String text) {
        String fallback = NativeLocaleStrings.get(context, R.string.native_focus_session);
        if (text == null) return fallback;
        String clean = text.replaceAll("[\\p{Cntrl}]", " ").trim();
        return clean.isEmpty() ? fallback : clean.substring(0, Math.min(clean.length(), 100));
    }

    private static PendingIntent pending(Context context, long token) {
        Intent i = new Intent(context, FocusAlarmReceiver.class);
        i.setAction(FIRE);
        i.putExtra("token", token);
        return PendingIntent.getBroadcast(context, REQUEST, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void clearSystemAlarm(Context context) {
        AlarmManager manager = alarms(context);
        if (manager != null) {
            // Intent identity matches all earlier timer alarms; extras are ignored for identity.
            manager.cancel(pending(context, 0));
        }
    }

    private static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = notifications(context);
        if (manager == null) return;

        NotificationChannel active = new NotificationChannel(
                CHANNEL_ACTIVE,
                NativeLocaleStrings.get(context, R.string.native_channel_active_name),
                NotificationManager.IMPORTANCE_LOW);
        active.setDescription(NativeLocaleStrings.get(context,
                R.string.native_channel_active_description));
        manager.createNotificationChannel(active);

        NotificationChannel done = new NotificationChannel(
                CHANNEL_DONE,
                NativeLocaleStrings.get(context, R.string.native_channel_done_name),
                NotificationManager.IMPORTANCE_HIGH);
        done.setDescription(NativeLocaleStrings.get(context,
                R.string.native_channel_done_description));
        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        done.setSound(sound, new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION).build());
        done.enableVibration(true);
        manager.createNotificationChannel(done);
    }

    private static PendingIntent openApp(Context context) {
        Intent i = new Intent(context, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, 2202, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void showActive(Context context, long deadline, String title) {
        if (!canNotify(context)) return;
        createChannels(context);
        NotificationManager manager = notifications(context);
        if (manager == null) return;
        try {
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ACTIVE)
                    .setSmallIcon(R.drawable.ic_launcher)
                    .setContentTitle(NativeLocaleStrings.format(context,
                            R.string.native_notification_title, cleanTitle(context, title)))
                    .setContentText(NativeLocaleStrings.get(context, R.string.native_notification_active))
                    .setWhen(deadline)
                    .setShowWhen(true)
                    .setUsesChronometer(true)
                    .setChronometerCountDown(true)
                    .setOnlyAlertOnce(true)
                    .setOngoing(true)
                    .setContentIntent(openApp(context))
                    .setPriority(NotificationCompat.PRIORITY_LOW);
            manager.notify(ACTIVE_NOTIFICATION, builder.build());
        } catch (SecurityException ignored) {
            // Notification permission may be denied; the timer still runs by deadline.
        }
    }

    private static void showDone(Context context, String title) {
        NotificationManager manager = notifications(context);
        if (manager == null) return;
        manager.cancel(ACTIVE_NOTIFICATION);
        if (!canNotify(context)) return;
        createChannels(context);
        try {
            manager.notify(DONE_NOTIFICATION, new NotificationCompat.Builder(context, CHANNEL_DONE)
                    .setSmallIcon(R.drawable.ic_launcher)
                    .setContentTitle(NativeLocaleStrings.format(context, R.string.native_notification_title,
                            NativeLocaleStrings.get(context, R.string.native_notification_time_up)))
                    .setContentText(cleanTitle(context, title))
                    .setContentIntent(openApp(context))
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .build());
        } catch (SecurityException ignored) {
            // Never turn a denied notification into an app crash.
        }
    }

    private static void scheduleSystemAlarm(Context context, long token, long deadline) {
        AlarmManager manager = alarms(context);
        if (manager == null) return;
        // Inexact user-requested end notification: NO exact-alarm special access needed.
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, deadline, pending(context, token));
    }

    /**
     * Re-render native notification strings after an explicit WebView locale change.
     * Never schedules an alarm or changes the v21 session / native timer state.
     */
    public static synchronized void refreshLocale(Context context) {
        createChannels(context);
        SharedPreferences p = prefs(context);
        if (p.getBoolean("active", false)) {
            showActive(context, p.getLong("deadline", 0),
                    p.getString("title", null));
        }
    }

    /** Called when the user starts, resumes or adjusts their countdown. */
    public static synchronized void schedule(Context context, int seconds, String title) {
        if (seconds < 1 || seconds > MAX_SECONDS) return;
        long now = System.currentTimeMillis();
        long deadline = now + seconds * 1000L;
        SharedPreferences p = prefs(context);
        long oldToken = p.getLong("token", 0);
        boolean oldActive = p.getBoolean("active", false);
        long oldDeadline = p.getLong("deadline", 0);
        long oldNotified = p.getLong("lastNotified", 0);
        String oldTitle = p.getString("title", null);
        long token = oldToken + 1;
        String safeTitle = cleanTitle(context, title);
        if (!p.edit().putBoolean("active", true).putLong("token", token)
                .putLong("deadline", deadline).putString("title", safeTitle)
                .putLong("lastNotified", 0).commit()) {
            // SharedPreferences changes memory even when its disk commit fails.
            // Restore the generation before returning so the still-scheduled old
            // PendingIntent remains valid; never cancel it for a refused update.
            p.edit().putBoolean("active", oldActive).putLong("token", oldToken)
                    .putLong("deadline", oldDeadline).putString("title", oldTitle)
                    .putLong("lastNotified", oldNotified).commit();
            return;
        }
        clearSystemAlarm(context);
        scheduleSystemAlarm(context, token, deadline);
        showActive(context, deadline, safeTitle);
    }

    /** Called when user pauses/cancels a countdown. Never clears v21 WebView data. */
    public static synchronized void cancel(Context context) {
        SharedPreferences p = prefs(context);
        boolean wasActive = p.getBoolean("active", false);
        // Do not remove the existing OS alarm until native cancellation is durable.
        // A failed SharedPreferences commit still updates its in-memory map.
        if (!p.edit().putBoolean("active", false).commit()) {
            p.edit().putBoolean("active", wasActive).commit();
            return;
        }
        clearSystemAlarm(context);
        NotificationManager manager = notifications(context);
        if (manager != null) manager.cancel(ACTIVE_NOTIFICATION);
    }

    /** Called by the page when the countdown reaches zero while it is visible. */
    public static synchronized void completeNow(Context context, String title) {
        SharedPreferences p = prefs(context);
        long now = System.currentTimeMillis();
        boolean wasActive = p.getBoolean("active", false);
        long previousNotified = p.getLong("lastNotified", 0);
        // Prevent duplicate alert if AlarmManager has already posted completion.
        if (!wasActive && now - previousNotified < 120000) return;
        String safeTitle = cleanTitle(context, title);
        if (p.edit().putBoolean("active", false).putLong("lastNotified", now).commit()) {
            clearSystemAlarm(context);
            showDone(context, safeTitle);
        } else {
            // Refusing a completion receipt must not permanently lose notification.
            // Restore the in-memory state and retry inexact delivery after a bounded
            // delay. The old token remains authoritative; a later Cancel invalidates it.
            p.edit().putBoolean("active", wasActive)
                    .putLong("lastNotified", previousNotified).commit();
            if (wasActive) {
                scheduleSystemAlarm(context, p.getLong("token", 0), now + 30000L);
            }
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        handleReceive(context, intent);
    }

    // The bridge runs on a WebView thread while broadcasts arrive on the main
    // thread. Share schedule/cancel's class lock across validation and delivery.
    private static synchronized void handleReceive(Context context, Intent intent) {
        if (intent == null) return;
        SharedPreferences p = prefs(context);
        if (!p.getBoolean("active", false)) return;
        long token = p.getLong("token", -1);
        long deadline = p.getLong("deadline", 0);
        String title = p.getString("title",
                NativeLocaleStrings.get(context, R.string.native_focus_session));
        long now = System.currentTimeMillis();
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            if (deadline > now) {
                scheduleSystemAlarm(context, token, deadline);
                showActive(context, deadline, title);
            } else {
                completeNow(context, title);
            }
            return;
        }
        if (!FIRE.equals(action) || intent.getLongExtra("token", -2) != token) return;
        if (deadline > now) {
            // Clock moved backwards: don't deliver before the intended deadline.
            scheduleSystemAlarm(context, token, deadline);
            return;
        }
        completeNow(context, title);
    }
}
