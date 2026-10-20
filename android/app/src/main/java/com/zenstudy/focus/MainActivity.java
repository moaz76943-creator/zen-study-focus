package com.zenstudy.focus;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }

        WebView.setWebContentsDebuggingEnabled(false);
        if (!"com.zenstudy.focus".equals(getPackageName())) {
            finish();
            return;
        }

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSaveFormData(false);

        webView.addJavascriptInterface(new ZenNativeBridge(), "ZenNative");
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl("file:///android_asset/web/index.html");
    }

    public class ZenNativeBridge {
        @JavascriptInterface
        public void startBackgroundService(int seconds, String title) {
            Intent i = new Intent(MainActivity.this, FocusTimerService.class);
            i.setAction("START");
            i.putExtra("seconds", seconds);
            i.putExtra("title", title);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(i);
            } else {
                startService(i);
            }
        }

        @JavascriptInterface
        public void stopBackgroundService() {
            Intent i = new Intent(MainActivity.this, FocusTimerService.class);
            i.setAction("STOP");
            startService(i);
        }

        @JavascriptInterface
        public void triggerCompletionSound(String title) {
            Intent i = new Intent(MainActivity.this, FocusTimerService.class);
            i.setAction("ALARM_NOW");
            i.putExtra("title", title);
            startService(i);
        }

        @JavascriptInterface
        public void shareAppInvite(String statsSummary) {
            if (statsSummary == null) {
                statsSummary = "";
            }

            // Sanitize: remove HTML tags and truncate to 1000 characters
            String sanitizedSummary = statsSummary.replaceAll("<[^>]*>", "");
            if (sanitizedSummary.length() > 1000) {
                sanitizedSummary = sanitizedSummary.substring(0, 1000) + "...";
            }

            Intent share = new Intent(Intent.ACTION_SEND);
            share.setType("text/plain");
            share.putExtra(Intent.EXTRA_SUBJECT, "ZEN FOCUS — Study, Workout & Deep Work App");
            share.putExtra(Intent.EXTRA_TEXT, sanitizedSummary);
            startActivity(Intent.createChooser(share, "Share ZEN FOCUS via"));
        }

        @JavascriptInterface
        public void syncBackupToGoogleEmailOrDrive(String encryptedBackupPayload) {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_SUBJECT, "ZEN FOCUS Cloud Backup (" + java.time.LocalDate.now() + ")");
            send.putExtra(Intent.EXTRA_TEXT,
                "Save this message in your Google Email (Gmail) or Google Drive to restore your progress on any phone.\n\n" +
                "--- COPY CODE BELOW ---\n" + encryptedBackupPayload
            );
            startActivity(Intent.createChooser(send, "Save Backup to Gmail / Google Drive"));
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript("if(window.handleAndroidBack && window.handleAndroidBack()){}else{history.back();}", null);
        } else {
            super.onBackPressed();
        }
    }
}
