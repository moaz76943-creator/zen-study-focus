package com.zenstudy.focus;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.content.SharedPreferences;
import android.content.res.AssetFileDescriptor;
import android.net.Uri;
import android.os.Build;
import android.os.CountDownTimer;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import androidx.core.app.NotificationCompat;

public class FocusTimerService extends Service {
    public static final String CHANNEL_ONGOING = "zen_ongoing_timer_channel";
    public static final String CHANNEL_ALARM = "zen_completion_visual_v22";
    private CountDownTimer countDownTimer;
    private PowerManager.WakeLock wakeLock;
    private String currentTitle = "Deep Focus";

    @Override
    public void onCreate() {
        super.onCreate();
        createChannels();
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ZenFocus::TimerWakeLock");
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        String action = intent.getAction();

        if ("START".equals(action)) {
            int seconds = intent.getIntExtra("seconds", 1500);
            currentTitle = intent.getStringExtra("title");
            if (currentTitle == null || currentTitle.isEmpty()) currentTitle = "Active Focus Session";
            startForegroundTimer(seconds, currentTitle);
        } else if ("STOP".equals(action)) {
            stopTimerAndService();
        } else if ("ALARM_NOW".equals(action)) {
            String msg = intent.getStringExtra("title");
            triggerCompletionAlarm(msg != null ? msg : "Session Completed!");
            stopTimerAndService();
        }
        return START_STICKY;
    }

    private void startForegroundTimer(int totalSeconds, String title) {
        if (countDownTimer != null) countDownTimer.cancel();
        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(totalSeconds * 1000L + 10000L);
        }

        Notification initialNotif = buildOngoingNotification(title, formatSeconds(totalSeconds));
        startForeground(1001, initialNotif);

        countDownTimer = new CountDownTimer(totalSeconds * 1000L, 1000L) {
            @Override
            public void onTick(long millisUntilFinished) {
                int rem = (int) (millisUntilFinished / 1000L);
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.notify(1001, buildOngoingNotification(currentTitle, formatSeconds(rem)));
                }
            }

            @Override
            public void onFinish() {
                triggerCompletionAlarm(currentTitle + " — Completed! 🎉");
                stopTimerAndService();
            }
        }.start();
    }

    private void stopTimerAndService() {
        if (countDownTimer != null) {
            countDownTimer.cancel();
            countDownTimer = null;
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        stopForeground(true);
        stopSelf();
    }

    private Notification buildOngoingNotification(String title, String timeStr) {
        Intent openIntent = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(
            this, 0, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ONGOING)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle("⏱️ " + timeStr + " • " + title)
            .setContentText("Deep Focus is running in background — Tap to open")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pi)
            .build();
    }

    private void playRecordedCompletionCue() {
        // Avoid two sounds: WebView handles foreground playback, the service handles background.
        if (MainActivity.isWebViewVisible()) return;
        SharedPreferences settings = getSharedPreferences("zen_completion_playback_cache_v22", MODE_PRIVATE);
        if (!settings.getBoolean("enabled", true)) return;
        final int volume = settings.getInt("volume", 35);
        if (volume <= 0) return;
        final String selected = settings.getString("sound", "soft-bell");
        if (selected == null || "silent".equals(selected)) return;
        final String filename;
        switch (selected) {
            case "soft-bell": filename = "soft_bell.wav"; break;
            case "wood-tap": filename = "wood_tap.wav"; break;
            case "water-drop": filename = "water_drop.wav"; break;
            case "muted-metal": filename = "muted_metal.wav"; break;
            case "two-taps": filename = "two_taps.wav"; break;
            default: return;
        }
        MediaPlayer player = null;
        try (AssetFileDescriptor sound = getAssets().openFd("web/completion_alerts/" + filename)) {
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            player.setDataSource(sound.getFileDescriptor(), sound.getStartOffset(), sound.getLength());
            player.prepare();
            float gain = Math.min(0.65f, Math.max(0f, volume / 100f * 0.65f));
            player.setVolume(gain, gain);
            player.setOnCompletionListener(MediaPlayer::release);
            player.setOnErrorListener((mp, what, extra) -> { mp.release(); return true; });
            player.start();
            player = null; // completion callback now owns release
        } catch (Exception unavailable) {
            if (player != null) player.release();
            // No synthetic fallback and no default loud alarm on missing/undecodable media.
        }
    }

    private void triggerCompletionAlarm(String title) {
        playRecordedCompletionCue();
        Intent openIntent = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(this, 1, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ALARM)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle("Deep Focus — Timer complete")
            .setContentText(title)
            .setAutoCancel(true)
            .setSilent(true)
            .setDefaults(0)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pi);
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(2002, builder.build());
    }

    private String formatSeconds(int totalSecs) {
        int m = totalSecs / 60;
        int s = totalSecs % 60;
        return String.format(java.util.Locale.US, "%02d:%02d", m, s);
    }

    private void createChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            NotificationChannel ongoing = new NotificationChannel(
                CHANNEL_ONGOING, "Active Focus Timer Bar", NotificationManager.IMPORTANCE_LOW
            );
            ongoing.setDescription("Shows live countdown timer in status bar");
            nm.createNotificationChannel(ongoing);

            // New visual-only channel: old Android O+ channel sounds persist when code is updated.
            // Per-user completion cue playback is handled above, not by a duplicate channel sound.
            NotificationChannel visual = new NotificationChannel(
                CHANNEL_ALARM, "Deep Focus timer result", NotificationManager.IMPORTANCE_DEFAULT);
            visual.setDescription("Quiet timer completion status");
            visual.setSound(null, null);
            visual.enableVibration(false);
            nm.createNotificationChannel(visual);
        }
    }

    @Override
    public void onDestroy() {
        if (countDownTimer != null) {
            countDownTimer.cancel();
            countDownTimer = null;
        }
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
