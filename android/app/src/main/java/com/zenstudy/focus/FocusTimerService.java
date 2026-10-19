package com.zenstudy.focus;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
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
    public static final String CHANNEL_ALARM = "zen_completion_alarm_channel";
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

    private void triggerCompletionAlarm(String title) {
        try {
            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            Ringtone ringtone = RingtoneManager.getRingtone(getApplicationContext(), alarmUri);
            if (ringtone != null) {
                ringtone.play();
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    try { if (ringtone.isPlaying()) ringtone.stop(); } catch (Exception ignored) {}
                }, 4500);
            }
        } catch (Exception ignored) {}

        try {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) {
                long[] pattern = {0, 400, 200, 400, 200, 600};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    v.vibrate(pattern, -1);
                }
            }
        } catch (Exception ignored) {}

        Intent openIntent = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(
            this, 1, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ALARM)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle("🎉 Deep Focus — Time is Up!")
            .setContentText(title)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(pi);

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(2002, builder.build());
        }
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

            NotificationChannel alarm = new NotificationChannel(
                CHANNEL_ALARM, "Timer Completion Alerts", NotificationManager.IMPORTANCE_HIGH
            );
            alarm.setDescription("Plays sound and vibrates when session finishes");
            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();
            alarm.setSound(soundUri, attrs);
            alarm.enableVibration(true);
            nm.createNotificationChannel(alarm);
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
