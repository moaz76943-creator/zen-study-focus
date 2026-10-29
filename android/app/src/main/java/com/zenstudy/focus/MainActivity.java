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
import java.io.File;
import java.io.FileOutputStream;
import android.util.AtomicFile;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private FocusAppWebChromeClient appDialogs;
    private static final int REQUEST_BACKUP_EXPORT = 7410;
    private static final int REQUEST_ANALYTICS_EXPORT = 7413;
    private String analyticsAwaitingSave = null;
    private String analyticsAwaitingRequest = null;
    private static final int REQUEST_BACKUP_IMPORT = 7412;
    private static final int MAX_BACKUP_IMPORT_BYTES = 8 * 1024 * 1024;
    private boolean backupImportPickerOpen = false;
    private String backupAwaitingSave = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Display stays awake only in user-selected Desk Clock mode.

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
        appDialogs = new FocusAppWebChromeClient(this);
        webView.setWebChromeClient(appDialogs);
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


    // Separate, optional active-timer receipt: never alter the six v21 storage keys.
    private final Object activeTimerCheckpointLock = new Object();
    private static final int ACTIVE_TIMER_MAX_BYTES = 256 * 1024;
    private boolean validActiveTimerPacket(String raw) {
        if (raw == null || raw.getBytes(StandardCharsets.UTF_8).length > ACTIVE_TIMER_MAX_BYTES) return false;
        try {
            org.json.JSONObject packet = new org.json.JSONObject(raw);
            String payload = packet.getString("payload");
            String sig = packet.getString("sig");
            int hash = (int)2166136261L;
            for (char c : (payload + "ZEN_FORTRESS_V21_99812").toCharArray()) {
                hash ^= c; hash *= 16777619;
            }
            if (!Long.toHexString(hash & 0xffffffffL).equals(sig)) return false;
            org.json.JSONObject state = new org.json.JSONObject(payload);
            double total = state.getDouble("total"), left = state.getDouble("left");
            if (!Double.isFinite(total) || !Double.isFinite(left) ||
                total < 1 || total > 86400 || left < 0 || left > 86400 ||
                !(state.opt("running") instanceof Boolean)) return false;
            if (state.getBoolean("running")) {
                double endAt = state.getDouble("endAt");
                if (!Double.isFinite(endAt) || endAt <= 0) return false;
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
                // A surviving marker means publication was interrupted or its rollback
                // could not be verified. Never replay an uncertain/rejected edit.
                File marker = new File(getFilesDir(),"v21_durable_packets_v1.pending");
                if (marker.exists()) return false;
                byte[] previous = null;
                boolean publicationStarted = false;
                FileOutputStream stream=null;
                try {
                    File base = file.getBaseFile();
                    if (base.exists() || new File(base.getPath()+".bak").exists())
                        previous = file.readFully();
                    try (FileOutputStream pending = new FileOutputStream(marker)) {
                        pending.write(1);
                        pending.getFD().sync();
                    }
                    publicationStarted = true;
                    stream=file.startWrite();
                    stream.write(bytes);
                    stream.getFD().sync();
                    file.finishWrite(stream);
                    stream=null;
                    // AtomicFile can log a failed rename instead of throwing.
                    if (!java.util.Arrays.equals(bytes,file.readFully()))
                        throw new java.io.IOException("Native publication not verified");
                    if (!marker.delete()) throw new java.io.IOException("Native marker cleanup failed");
                    return true;
                } catch (Exception error) {
                    if (!publicationStarted) return false;
                    if (stream!=null) file.failWrite(stream);
                    // Readback can fail AFTER publication. Restore the old receipt
                    // before returning false so it cannot resurrect after restart.
                    try {
                        if (previous == null) {
                            file.delete();
                            if (file.getBaseFile().exists()) return false;
                        } else {
                            FileOutputStream restore = null;
                            try {
                                restore=file.startWrite();
                                restore.write(previous);
                                restore.getFD().sync();
                                file.finishWrite(restore);
                                restore=null;
                                if (!java.util.Arrays.equals(previous,file.readFully())) return false;
                            } finally { if (restore!=null) file.failWrite(restore); }
                        }
                        // If rollback fails, retain the marker and fail closed on reboot.
                        marker.delete();
                    } catch (Exception rollbackError) { /* retain marker and packets */ }
                    return false;
                }
            }
        }

        @JavascriptInterface
        public String readDurableV21() {
            synchronized (durableV21Lock) {
                if (new File(getFilesDir(),"v21_durable_packets_v1.pending").exists()) return "ERROR";
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


        // Atomic pause/start checkpoint independent from six-family v21 ACK.
        @JavascriptInterface
        public boolean acknowledgeActiveTimerSnapshot(String packet) {
            if (!validActiveTimerPacket(packet)) return false;
            final byte[] bytes = packet.getBytes(StandardCharsets.UTF_8);
            synchronized (activeTimerCheckpointLock) {
                AtomicFile file = new AtomicFile(new File(getFilesDir(), "active_timer_checkpoint_v1"));
                FileOutputStream stream = null;
                try {
                    stream = file.startWrite();
                    stream.write(bytes);
                    stream.getFD().sync();
                    file.finishWrite(stream);
                    return java.util.Arrays.equals(bytes, file.readFully());
                } catch (Exception error) {
                    if (stream != null) file.failWrite(stream);
                    return false;
                }
            }
        }

        @JavascriptInterface
        public String readActiveTimerSnapshot() {
            synchronized (activeTimerCheckpointLock) {
                AtomicFile file = new AtomicFile(new File(getFilesDir(), "active_timer_checkpoint_v1"));
                File base = file.getBaseFile();
                if (!base.exists() && !new File(base.getPath() + ".bak").exists()) return "NONE";
                try {
                    byte[] bytes = file.readFully();
                    if (bytes.length > ACTIVE_TIMER_MAX_BYTES) return "ERROR";
                    String raw = new String(bytes, StandardCharsets.UTF_8);
                    return validActiveTimerPacket(raw) ? raw : "ERROR";
                } catch (Exception error) { return "ERROR"; }
            }
        }


        // Legacy WebView bridge names retained to preserve old v21 session behavior.
        // No Android Service is started: user countdown end time is handled by AlarmManager.
        @JavascriptInterface
        public void startBackgroundService(int seconds, String title) {
            if (seconds < 1 || seconds > 86400) return;
            FocusAlarmReceiver.schedule(MainActivity.this, seconds, title);
        }

        @JavascriptInterface
        public void setNativeLocale(String languageTag) {
            if (NativeLocaleStrings.select(MainActivity.this, languageTag)) {
                FocusAlarmReceiver.refreshLocale(MainActivity.this);
            }
        }

        // Consent belongs to an explicit user Start, never restored countdowns.
        @JavascriptInterface
        public void requestTimerNotificationPermission() {
            runOnUiThread(() -> requestNotificationPermissionForTimer());
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
        public void importBackupFromFile() {
            runOnUiThread(() -> {
                if (backupImportPickerOpen) return;
                backupImportPickerOpen = true;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES,
                        new String[]{"text/plain", "application/json", "application/octet-stream"});
                try {
                    startActivityForResult(intent, REQUEST_BACKUP_IMPORT);
                } catch (Exception error) {
                    backupImportPickerOpen = false;
                    Toast.makeText(MainActivity.this,
                            NativeLocaleStrings.get(MainActivity.this, R.string.native_backup_import_picker_unavailable),
                            Toast.LENGTH_LONG).show();
                }
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
                    Toast.makeText(MainActivity.this, NativeLocaleStrings.get(MainActivity.this, R.string.native_backup_picker_unavailable),
                            Toast.LENGTH_LONG).show();
                }
            });
        }

        // A correlated receipt follows closed-stream write and byte-for-byte readback.
        @JavascriptInterface
        public void exportAnalyticsCsvToFile(String csv, String requestId) {
            if (requestId == null || !requestId.matches("df-csv-[0-9]{1,16}")) return;
            if (csv == null || csv.getBytes(StandardCharsets.UTF_8).length > NativeCsvWriter.MAX_BYTES
                    || !(csv.startsWith("\"id\"") || csv.startsWith("\"date\"")
                        || csv.startsWith("\"period\""))) {
                reportAnalyticsSave(requestId, "failed");
                return;
            }
            runOnUiThread(() -> {
                if (analyticsAwaitingRequest != null || isDestroyed()) {
                    reportAnalyticsSave(requestId, "failed");
                    return;
                }
                analyticsAwaitingSave = csv;
                analyticsAwaitingRequest = requestId;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("text/csv");
                intent.putExtra(Intent.EXTRA_TITLE, "deep-focus-analytics.csv");
                try { startActivityForResult(intent, REQUEST_ANALYTICS_EXPORT); }
                catch (Exception error) {
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
            share.putExtra(Intent.EXTRA_SUBJECT, NativeLocaleStrings.get(MainActivity.this, R.string.native_share_subject));
            share.putExtra(Intent.EXTRA_TEXT, statsSummary);
            startActivity(Intent.createChooser(share, NativeLocaleStrings.get(MainActivity.this, R.string.native_share_chooser)));
        }

        @JavascriptInterface
        public void syncBackupToGoogleEmailOrDrive(String encryptedBackupPayload) {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_SUBJECT, NativeLocaleStrings.format(MainActivity.this, R.string.native_backup_share_subject,
                    new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date())));
            send.putExtra(Intent.EXTRA_TEXT,
                NativeLocaleStrings.get(MainActivity.this, R.string.native_backup_privacy_warning) +
                NativeLocaleStrings.get(MainActivity.this, R.string.native_backup_copy_heading) + encryptedBackupPayload
            );
            startActivity(Intent.createChooser(send, NativeLocaleStrings.get(MainActivity.this, R.string.native_backup_share_chooser)));
        }
    }

    private void reportAnalyticsSave(String requestId, String status) {
        if (webView == null || requestId == null || isDestroyed()) return;
        final String callback = "window.DFRecoveryNativeExportResult && window.DFRecoveryNativeExportResult("
                + org.json.JSONObject.quote(requestId) + "," + org.json.JSONObject.quote(status) + ");";
        webView.post(() -> {
            if (webView != null && !isDestroyed()) webView.evaluateJavascript(callback, null);
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_ANALYTICS_EXPORT) {
            final String payload = analyticsAwaitingSave, requestId = analyticsAwaitingRequest;
            analyticsAwaitingSave = null;
            analyticsAwaitingRequest = null;
            if (resultCode != Activity.RESULT_OK) {
                reportAnalyticsSave(requestId, "cancelled");
                return;
            }
            if (payload == null || data == null || data.getData() == null) {
                reportAnalyticsSave(requestId, "failed");
                return;
            }
            final Uri target = data.getData();
            // Keep the UI responsive while a user-selected document provider performs IO.
            analyticsAwaitingRequest = requestId;
            new Thread(() -> {
                String status;
                try {
                    NativeCsvWriter.writeAndVerify(new NativeCsvWriter.Document() {
                        public OutputStream openOutput() throws java.io.IOException {
                            return getContentResolver().openOutputStream(target, "wt");
                        }
                        public java.io.InputStream openInput() throws java.io.IOException {
                            return getContentResolver().openInputStream(target);
                        }
                    }, payload);
                    status = "saved";
                } catch (Exception error) { status = "failed"; }
                final String receipt = status;
                runOnUiThread(() -> {
                    analyticsAwaitingRequest = null;
                    reportAnalyticsSave(requestId, receipt);
                });
            }, "df-csv-export").start();
            return;
        }
        if (requestCode == REQUEST_BACKUP_IMPORT) {
            backupImportPickerOpen = false;
            if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null) return;
            try (java.io.InputStream source =
                    getContentResolver().openInputStream(data.getData())) {
                if (source == null) throw new java.io.IOException("No selected document");
                java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
                byte[] chunk = new byte[8192];
                int total = 0, count;
                while ((count = source.read(chunk)) != -1) {
                    total += count;
                    if (total > MAX_BACKUP_IMPORT_BYTES)
                        throw new java.io.IOException("Backup exceeds size limit");
                    bytes.write(chunk, 0, count);
                }
                final String backupCode =
                        new String(bytes.toByteArray(), StandardCharsets.UTF_8);
                if (backupCode.trim().isEmpty()) throw new java.io.IOException("Empty backup");
                if (webView == null || isDestroyed()) return;
                // Native only transports user-picked text. Existing v21 code owns
                // checksum/schema verification, explicit consent and atomic commit.
                final String script = "if(typeof verifyAndRestoreBackupCode==='function')"
                        + "verifyAndRestoreBackupCode("
                        + org.json.JSONObject.quote(backupCode) + ");";
                webView.post(() -> {
                    if (webView != null && !isDestroyed())
                        webView.evaluateJavascript(script, null);
                });
            } catch (Exception error) {
                Toast.makeText(this, NativeLocaleStrings.get(this, R.string.native_backup_import_failed),
                        Toast.LENGTH_LONG).show();
            }
            return;
        }
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
            FocusAlarmReceiver.refreshLocale(this);
        }
    }

    @Override
    protected void onDestroy() {
        if (appDialogs != null) appDialogs.cancelPending();
        super.onDestroy();
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
