package com.zenstudy.focus;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.app.Activity;
import android.widget.Toast;
import android.util.AtomicFile;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import java.io.ByteArrayInputStream;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private static volatile boolean webViewVisible = false;
    public static boolean isWebViewVisible() { return webViewVisible; }

    @Override
    protected void onResume() {
        super.onResume();
        webViewVisible = true;
    }

    @Override
    protected void onPause() {
        webViewVisible = false;
        super.onPause();
    }

    private static final int REQUEST_BACKUP_EXPORT = 7410;
    private static final int REQUEST_ANALYTICS_EXPORT = 7411;
    private String analyticsAwaitingSave = null;
    private String analyticsAwaitingRequest = null;
    private String backupAwaitingSave = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Display stays awake only in user-selected Desk Clock mode.

        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }

        // The release APK must never expose its WebView DevTools endpoint.
        // Debug-only inspection lets disposable Android emulators verify real DOM,
        // instead of treating an empty UIAutomator tree as a proven app failure.
        final boolean debuggableBuild =
                (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debuggableBuild);
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
        // android_asset resources remain available with general filesystem access off.
        // Keep the existing file origin: changing it would orphan v21 localStorage.
        settings.setAllowFileAccess(false);
        settings.setBlockNetworkLoads(true);
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
                // The privileged JS bridge belongs only to bundled app assets.
                if (request.isForMainFrame() && isBundledAsset(uri)
                        && "/android_asset/web/index.html".equals(uri.getPath())) return false;
                if (request.isForMainFrame() && uri != null
                        && "https".equalsIgnoreCase(uri.getScheme())
                        && uri.getHost() != null && uri.getUserInfo() == null) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (Exception ignored) {}
                }
                return true;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (isBundledAsset(request.getUrl())) return null;
                // Navigation callbacks alone do not police scripts, images or frames.
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked",
                        java.util.Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl("file:///android_asset/web/index.html");
    }

    private static boolean isBundledAsset(Uri uri) {
        if (uri == null || !"file".equalsIgnoreCase(uri.getScheme())
                || (uri.getAuthority() != null && !uri.getAuthority().isEmpty())) return false;
        String path = uri.getPath();
        if (path == null || !path.startsWith("/android_asset/web/")
                || path.indexOf('\\') >= 0 || path.indexOf('%') >= 0 || path.indexOf('\0') >= 0) return false;
        for (String part : path.split("/")) {
            if ("..".equals(part) || ".".equals(part)) return false;
        }
        return true;
    }


    // Exactly the existing v21 six raw packets, preserved byte-for-byte.
    private final Object durableV21Lock = new Object();
    private static final int MAX_DURABLE_V21_BYTES = 64 * 1024 * 1024;
    private static final String[] DURABLE_V21_KEYS = {
        "zen_fortress_cfg_v21", "zen_fortress_cfg_v21_mirror",
        "zen_fortress_tasks_v21", "zen_fortress_tasks_v21_mirror",
        "zen_fortress_notes_v21", "zen_fortress_notes_v21_mirror"
    };
    private boolean validV21Envelope(String text) {
        if (text==null || text.length()>MAX_DURABLE_V21_BYTES) return false;
        try {
            org.json.JSONObject data = new org.json.JSONObject(text);
            if (data.getInt("version")!=1) return false;
            org.json.JSONObject packets = data.getJSONObject("packets");
            if (packets.length()!=DURABLE_V21_KEYS.length) return false;
            for (String key : DURABLE_V21_KEYS) {
                if (!packets.has(key)) return false;
                Object packet = packets.get(key);
                if (packet!=org.json.JSONObject.NULL && !(packet instanceof String)) return false;
            }
            return true;
        } catch (Exception ignored) { return false; }
    }

    public class ZenNativeBridge {
        // @JavascriptInterface executes on WebView's bridge thread, off the UI thread.
        // Acknowledgement requires a private AtomicFile with explicit FD sync.
        @JavascriptInterface
        public boolean acknowledgeDurableV21(String json) {
            if (!validV21Envelope(json)) return false;
            byte[] bytes=json.getBytes(StandardCharsets.UTF_8);
            if (bytes.length>MAX_DURABLE_V21_BYTES) return false;
            synchronized (durableV21Lock) {
                AtomicFile file=new AtomicFile(new File(getFilesDir(),"v21_durable_packets_v1"));
                FileOutputStream stream=null;
                try {
                    stream=file.startWrite();
                    stream.write(bytes);
                    stream.getFD().sync();
                    file.finishWrite(stream);
                    return true;
                } catch (Exception error) {
                    if (stream!=null) file.failWrite(stream);
                    return false;
                }
            }
        }

        @JavascriptInterface
        public String readDurableV21() {
            synchronized (durableV21Lock) {
                AtomicFile file=new AtomicFile(new File(getFilesDir(),"v21_durable_packets_v1"));
                File baseFile=file.getBaseFile();
                if (!baseFile.exists() && !new File(baseFile.getPath()+".bak").exists()) return "NONE";
                try {
                    byte[] bytes=file.readFully();
                    if (bytes.length>MAX_DURABLE_V21_BYTES) return "ERROR";
                    String json=new String(bytes,StandardCharsets.UTF_8);
                    return validV21Envelope(json)?json:"ERROR";
                } catch (Exception error) { return "ERROR"; }
            }
        }

        // Preserve the original two-argument JavaScript API for older callers.
        @JavascriptInterface
        public void startBackgroundService(int seconds, String title) {
            startBackgroundTimerInternal(seconds, title, null, null);
        }

        // v22 callers supply the stable v21 session ID and exact timer phase.
        @JavascriptInterface
        public void startBackgroundSession(int seconds, String title, String sessionId, String phase) {
            startBackgroundTimerInternal(seconds, title, sessionId, phase);
        }

        private void startBackgroundTimerInternal(int seconds, String title, String sessionId, String phase) {
            if (seconds < 1 || seconds > 86400) return;
            Intent i = new Intent(MainActivity.this, FocusTimerService.class);
            i.setAction("START");
            i.putExtra("seconds", seconds);
            i.putExtra("title", title);
            if (sessionId != null && sessionId.matches("[A-Za-z0-9._:-]{1,256}")) {
                i.putExtra("sessionId", sessionId);
            }
            if ("focus".equals(phase) || "custom".equals(phase) ||
                    "short".equals(phase) || "long".equals(phase)) {
                i.putExtra("phase", phase);
            }
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
            // stopService works even when Android disallows background service starts.
            stopService(i);
        }

        @JavascriptInterface
        public void triggerCompletionSound(String title) {
            Intent i = new Intent(MainActivity.this, FocusTimerService.class);
            i.setAction("ALARM_NOW");
            i.putExtra("title", title);
            startService(i);
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
                if (backupAwaitingSave != null) {
                    Toast.makeText(MainActivity.this, "A backup save is already open",
                            Toast.LENGTH_LONG).show();
                    return;
                }
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
                    Toast.makeText(MainActivity.this, "File picker unavailable; use Share Backup",
                            Toast.LENGTH_LONG).show();
                }
            });
        }

        // Native playback state mirrors the already-verified v21 cfg alert preferences.
        // SharedPreferences is NOT an authoritative backup or a migration of v21 records.
        @JavascriptInterface
        public void configureCompletionAlert(String sound, int volume, boolean enabled) {
            // Retain older callers and any existing rest preference.
            boolean includeRest = getSharedPreferences("zen_completion_playback_cache_v22", MODE_PRIVATE)
                    .getBoolean("includeRest", false);
            configureCompletionAlertV2(sound, volume, enabled, includeRest);
        }

        @JavascriptInterface
        public void configureCompletionAlertV2(String sound, int volume, boolean enabled, boolean includeRest) {
            if (sound == null || !sound.matches("silent|soft-bell|wood-tap|water-drop|muted-metal|two-taps")
                    || volume < 0 || volume > 100) return;
            getSharedPreferences("zen_completion_playback_cache_v22", MODE_PRIVATE).edit()
                    .putString("sound", sound)
                    .putInt("volume", volume)
                    .putBoolean("enabled", enabled)
                    .putBoolean("includeRest", includeRest)
                    .apply();
        }

        // Analytics uses a correlated, post-write SAF acknowledgment; starting a picker is not success.
        @JavascriptInterface
        public void exportAnalyticsCsvToFile(String csv, String requestId) {
            if (requestId == null || !requestId.matches("df-csv-[0-9]{1,12}")) return;
            if (csv == null || csv.length() > 4000000
                    || !(csv.startsWith("\"id\"") || csv.startsWith("\"date\"")
                      || csv.startsWith("\"period\""))) {
                reportAnalyticsSave(requestId, "failed");
                return;
            }
            runOnUiThread(() -> {
                if (analyticsAwaitingSave != null) {
                    reportAnalyticsSave(requestId, "failed");
                    return;
                }
                analyticsAwaitingSave = csv;
                analyticsAwaitingRequest = requestId;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("text/csv");
                intent.putExtra(Intent.EXTRA_TITLE, "deep-focus-analytics.csv");
                try {
                    startActivityForResult(intent, REQUEST_ANALYTICS_EXPORT);
                } catch (Exception e) {
                    analyticsAwaitingSave = null;
                    analyticsAwaitingRequest = null;
                    reportAnalyticsSave(requestId, "failed");
                }
            });
        }

        @JavascriptInterface
        public void shareAppInvite(String statsSummary) {
            Intent share = new Intent(Intent.ACTION_SEND);
            share.setType("text/plain");
            share.putExtra(Intent.EXTRA_SUBJECT, "Deep Focus — Study, Workout & Deep Work App");
            share.putExtra(Intent.EXTRA_TEXT, statsSummary);
            startActivity(Intent.createChooser(share, "Share Deep Focus via"));
        }

        @JavascriptInterface
        public void syncBackupToGoogleEmailOrDrive(String encryptedBackupPayload) {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_SUBJECT, "Deep Focus Manual Backup (UNENCRYPTED) (" + new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date()) + ")");
            send.putExtra(Intent.EXTRA_TEXT,
                "This code contains readable notes and tasks. Save it privately: it is NOT encrypted.\n\n" +
                "--- COPY CODE BELOW ---\n" + encryptedBackupPayload
            );
            startActivity(Intent.createChooser(send, "Save Backup to Gmail / Google Drive"));
        }
    }

    private void reportAnalyticsSave(String requestId, String status) {
        if (webView == null || requestId == null) return;
        final String callback = "window.DFRecoveryNativeExportResult && window.DFRecoveryNativeExportResult("
                + org.json.JSONObject.quote(requestId) + "," + org.json.JSONObject.quote(status) + ");";
        webView.post(() -> webView.evaluateJavascript(callback, null));
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_ANALYTICS_EXPORT) {
            final String payload = analyticsAwaitingSave;
            final String requestId = analyticsAwaitingRequest;
            analyticsAwaitingSave = null;
            analyticsAwaitingRequest = null;
            if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null) {
                reportAnalyticsSave(requestId, "cancelled");
                return;
            }
            if (payload == null) {reportAnalyticsSave(requestId, "failed"); return;}
            try {
                NativeDocumentWriter.writeUtf8(getContentResolver().openOutputStream(data.getData(), "w"), payload);
            } catch (Exception error) {
                reportAnalyticsSave(requestId, "failed");
                return;
            }
            reportAnalyticsSave(requestId, "saved");
            return;
        }
        if (requestCode != REQUEST_BACKUP_EXPORT) return;
        String payload = backupAwaitingSave;
        backupAwaitingSave = null;
        if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null
                || payload == null) return;
        try {
            NativeDocumentWriter.writeUtf8(getContentResolver().openOutputStream(data.getData(), "w"), payload);
        } catch (Exception error) {
            Toast.makeText(this, "Unable to save backup; existing data unchanged",
                    Toast.LENGTH_LONG).show();
            return;
        }
        Toast.makeText(this, "Backup exported; keep the unencrypted file private",
                Toast.LENGTH_LONG).show();
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
