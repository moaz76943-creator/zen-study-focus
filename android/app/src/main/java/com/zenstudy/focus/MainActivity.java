package com.zenstudy.focus;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.app.Activity;
import android.widget.Toast;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private static final int REQUEST_BACKUP_EXPORT = 7410;
    private String backupAwaitingSave = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Display stays awake only in user-selected Desk Clock mode.

        WebView.setWebContentsDebuggingEnabled(false);
        if (!"com.deepfocus.study".equals(getPackageName())) {
            finish();
            return;
        }

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSaveFormData(false);

        webView.addJavascriptInterface(new ZenNativeBridge(), "ZenNative");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String address = uri != null ? uri.toString() : "";
                // The privileged JS bridge belongs only to bundled app assets.
                if (address.startsWith("file:///android_asset/web/")) return false;
                if (uri != null && ("https".equalsIgnoreCase(uri.getScheme())
                         || "http".equalsIgnoreCase(uri.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (Exception ignored) {}
                }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl("file:///android_asset/web/index.html");
    }

    private void requestNotificationPermissionForTimer() {
        if (Build.VERSION.SDK_INT >= 33
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
        }
    }

    public class ZenNativeBridge {
        // Legacy WebView bridge names retained to preserve old v21 session behavior.
        // No Android Service is started: user countdown end time is handled by AlarmManager.
        @JavascriptInterface
        public void startBackgroundService(int seconds, String title) {
            if (seconds < 1 || seconds > 86400) return;
            FocusAlarmReceiver.schedule(MainActivity.this, seconds, title);
            // Request only after the user deliberately starts a background countdown.
            runOnUiThread(() -> requestNotificationPermissionForTimer());
        }

        // Optional locale bridge: the WebView can pass its selected BCP-47 language
        // without changing existing v21 data. Until called, native UI follows Android.
        @JavascriptInterface
        public void setNativeLocale(String languageTag) {
            if (NativeLocaleStrings.select(MainActivity.this, languageTag)) {
                FocusAlarmReceiver.refreshLocale(MainActivity.this);
            }
        }

        @JavascriptInterface
        public void stopBackgroundService() {
            FocusAlarmReceiver.cancel(MainActivity.this);
        }

        @JavascriptInterface
        public void triggerCompletionSound(String title) {
            FocusAlarmReceiver.completeNow(MainActivity.this, title);
        }

        @JavascriptInterface
        public void setDeskClockWake(boolean awake) {
            runOnUiThread(() -> {
                if (awake) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        @JavascriptInterface
        public void exportBackupToFile(String backupCode) {
            if (backupCode == null || !backupCode.startsWith("ZEN21::")
                    || backupCode.length() > 14000000) return;
            runOnUiThread(() -> {
                backupAwaitingSave = backupCode;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("text/plain");
                String filename = "deep-focus-" +
                    new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                        .format(new java.util.Date()) + ".zenbackup";
                intent.putExtra(Intent.EXTRA_TITLE, filename);
                try {
                    startActivityForResult(intent, REQUEST_BACKUP_EXPORT);
                } catch (Exception e) {
                    backupAwaitingSave = null;
                    Toast.makeText(MainActivity.this,
                            NativeLocaleStrings.get(MainActivity.this, R.string.native_backup_picker_unavailable),
                            Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface
        public void shareAppInvite(String statsSummary) {
            runOnUiThread(() -> {
                Intent share = new Intent(Intent.ACTION_SEND);
                share.setType("text/plain");
                share.putExtra(Intent.EXTRA_SUBJECT,
                        NativeLocaleStrings.get(MainActivity.this, R.string.native_share_subject));
                share.putExtra(Intent.EXTRA_TEXT, statsSummary);
                try {
                    startActivity(Intent.createChooser(share,
                            NativeLocaleStrings.get(MainActivity.this, R.string.native_share_chooser)));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this,
                            NativeLocaleStrings.get(MainActivity.this, R.string.native_share_unavailable),
                            Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface
        public void syncBackupToGoogleEmailOrDrive(String encryptedBackupPayload) {
            runOnUiThread(() -> {
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("text/plain");
                String date = new java.text.SimpleDateFormat("yyyy-MM-dd",
                        java.util.Locale.US).format(new java.util.Date());
                send.putExtra(Intent.EXTRA_SUBJECT,
                        NativeLocaleStrings.format(MainActivity.this,
                                R.string.native_backup_share_subject, date));
                send.putExtra(Intent.EXTRA_TEXT,
                        NativeLocaleStrings.get(MainActivity.this, R.string.native_backup_privacy_warning)
                        + NativeLocaleStrings.get(MainActivity.this, R.string.native_backup_copy_heading)
                        + encryptedBackupPayload);
                try {
                    startActivity(Intent.createChooser(send,
                            NativeLocaleStrings.get(MainActivity.this, R.string.native_backup_share_chooser)));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this,
                            NativeLocaleStrings.get(MainActivity.this, R.string.native_share_unavailable),
                            Toast.LENGTH_LONG).show();
                }
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_BACKUP_EXPORT) return;
        String payload = backupAwaitingSave;
        backupAwaitingSave = null;
        if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null
                || payload == null) return;
        try (OutputStream output = getContentResolver().openOutputStream(data.getData(), "w")) {
            if (output == null) throw new java.io.IOException("Cannot open target document");
            output.write(payload.getBytes(StandardCharsets.UTF_8));
            output.flush();
            Toast.makeText(this, NativeLocaleStrings.get(this, R.string.native_backup_exported),
                    Toast.LENGTH_LONG).show();
        } catch (Exception error) {
            Toast.makeText(this, NativeLocaleStrings.get(this, R.string.native_backup_save_failed),
                    Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == 101 && grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            // A running countdown may have started before POST_NOTIFICATIONS was granted.
            // Refresh its notification without touching its deadline or session state.
            FocusAlarmReceiver.refreshLocale(this);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript("Boolean(window.handleAndroidBack && window.handleAndroidBack())", result -> { if (!"true".equals(result)) finish(); });
        } else {
            super.onBackPressed();
        }
    }
}
