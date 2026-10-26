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
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private static final int REQUEST_BACKUP_EXPORT = 7410;
    private static final int REQUEST_BACKUP_IMPORT = 7412;
    private static final int MAX_BACKUP_IMPORT_BYTES = 8 * 1024 * 1024;
    private boolean backupImportPickerOpen = false;
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

        // Android emulator QA needs CDP, but production must never expose WebView DevTools.
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
                    // AtomicFile logs some publication failures without throwing.
                    // ACK only the exact bytes readable from the published base.
                    return java.util.Arrays.equals(bytes, file.readFully());
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


        // Legacy WebView bridge names retained to preserve old v21 session behavior.
        // No Android Service is started: user countdown end time is handled by AlarmManager.
        @JavascriptInterface
        public void startBackgroundService(int seconds, String title) {
            FocusAlarmReceiver.schedule(MainActivity.this, seconds, title);
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
                            "Backup picker unavailable; existing data unchanged",
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
                    Toast.makeText(MainActivity.this, "File picker unavailable; use Share Backup",
                            Toast.LENGTH_LONG).show();
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

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
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
                Toast.makeText(this, "Unable to read backup; data unchanged",
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
            Toast.makeText(this, "Backup exported; keep the unencrypted file private",
                    Toast.LENGTH_LONG).show();
        } catch (Exception error) {
            Toast.makeText(this, "Unable to save backup; existing data unchanged",
                    Toast.LENGTH_LONG).show();
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
