package com.zenstudy.focus;

import android.view.View;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.text.InputType;
import androidx.appcompat.app.AlertDialog;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * App-owned JS dialogs, preserving synchronous WebView confirm/alert/prompt.
 * Using Android's default WebChromeClient shows an alarming browser origin
 * ("file://") in front of the real timer controls on a user's phone.
 *
 * This class displays the message in an app-branded accessible native dialog.
 * It does NOT monkey-patch JS APIs or change saved v21 data/timer semantics.
 */
final class FocusAppWebChromeClient extends WebChromeClient {
    private static final String TRUSTED_URL = "file:///android_asset/web/index.html";
    private final MainActivity activity;
    private AlertDialog activeDialog;
    private Runnable activeCancel;

    FocusAppWebChromeClient(MainActivity activity) {
        this.activity = activity;
    }

    @Override
    public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
        return display(url, message, result, null, true);
    }

    @Override
    public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
        return display(url, message, result, null, false);
    }

    @Override
    public boolean onJsPrompt(WebView view, String url, String message,
            String defaultValue, JsPromptResult result) {
        if (!isTrusted(url)) {
            result.cancel();
            return true;
        }
        // The edit field is native and never persisted separately from the JS form.
        EditText input = new EditText(activity);
        input.setSingleLine(true);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        input.setText(defaultValue == null ? "" : defaultValue);
        input.setSelectAllOnFocus(true);
        LinearLayout container = new LinearLayout(activity);
        int inset = Math.round(activity.getResources().getDisplayMetrics().density * 20f);
        container.setPadding(inset, 0, inset, 0);
        container.setOrientation(LinearLayout.VERTICAL);
        container.addView(input, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        return display(url, message, result, container, true);
    }

    private boolean isTrusted(String url) {
        return TRUSTED_URL.equals(url) && !activity.isFinishing() && !activity.isDestroyed();
    }

    private boolean display(String url, String message, JsResult result,
            View entry, boolean allowCancel) {
        if (!isTrusted(url) || activeDialog != null) {
            result.cancel();
            return true;
        }
        final AtomicBoolean settled = new AtomicBoolean(false);
        final Runnable cancel = () -> {
            if (settled.compareAndSet(false, true)) {
                activeDialog = null;
                activeCancel = null;
                result.cancel();
            }
        };
        AlertDialog.Builder builder = new AlertDialog.Builder(activity)
                .setTitle("Deep Focus")
                .setMessage(message == null ? "" : message)
                .setOnCancelListener(dialog -> cancel.run())
                .setPositiveButton(android.R.string.ok, (dialog, which) -> {
                    if (!settled.compareAndSet(false, true)) return;
                    // JS may immediately ask a SECOND confirmation (delete -> backup).
                    // Release this dialog before unblocking JavaScript execution.
                    activeDialog = null;
                    activeCancel = null;
                    if (result instanceof JsPromptResult && entry instanceof LinearLayout) {
                        LinearLayout box = (LinearLayout) entry;
                        EditText input = (EditText) box.getChildAt(0);
                        ((JsPromptResult) result).confirm(input.getText().toString());
                    } else {
                        result.confirm();
                    }
                });
        if (allowCancel) {
            builder.setNegativeButton(android.R.string.cancel, (dialog, which) -> cancel.run());
        }
        if (entry != null) builder.setView(entry);
        try {
            AlertDialog dialog = builder.create();
            activeDialog = dialog;
            activeCancel = cancel;
            dialog.setOnDismissListener(d -> {
                cancel.run();
                if (activeDialog == dialog) {
                    activeDialog = null;
                    activeCancel = null;
                }
            });
            dialog.setCanceledOnTouchOutside(false);
            dialog.show();
        } catch (RuntimeException error) {
            // Never accept an action if the native dialog could not be presented.
            cancel.run();
            activeDialog = null;
            activeCancel = null;
        }
        return true;
    }

    /** Discard any unresolved confirmation when its owner Activity is destroyed. */
    void cancelPending() {
        // Resolve JS once and dismiss the same dialog even if cancel clears fields.
        final AlertDialog showing = activeDialog;
        final Runnable pendingCancel = activeCancel;
        if (pendingCancel != null) pendingCancel.run();
        if (showing != null) showing.dismiss();
        activeCancel = null;
        activeDialog = null;
    }
}
