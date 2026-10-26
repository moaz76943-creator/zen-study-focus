package com.zenstudy.focus.e2e;

import android.app.Instrumentation;
import android.app.UiAutomation;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.graphics.Rect;
import android.net.LocalServerSocket;
import android.net.LocalSocket;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Xml;
import android.view.accessibility.AccessibilityNodeInfo;
import org.json.JSONObject;
import org.xmlpull.v1.XmlSerializer;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/** Test-only, separate package. Reads real accessibility nodes; never app data or JS. */
public final class AccessibilityProbe extends Instrumentation {
    @Override public void onCreate(Bundle args) {
        super.onCreate(args);
        start();
    }

    @Override public void onStart() {
        UiAutomation automation = getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
        AccessibilityServiceInfo info = automation.getServiceInfo();
        info.flags |= AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS;
        automation.setServiceInfo(info);
        try (LocalServerSocket server = new LocalServerSocket("df13-accessibility")) {
            while (true) {
                try (LocalSocket client = server.accept()) {
                    client.setSoTimeout(45000);
                    BufferedReader input = new BufferedReader(new InputStreamReader(client.getInputStream(), StandardCharsets.UTF_8));
                    OutputStreamWriter output = new OutputStreamWriter(client.getOutputStream(), StandardCharsets.UTF_8);
                    String command = input.readLine();
                    if ("QUIT".equals(command)) break;
                    JSONObject response = new JSONObject();
                    try {
                        if ("DUMP".equals(command)) response.put("xml", hierarchy(automation));
                        else if (command != null && command.startsWith("CLICK "))
                            response.put("clicked", click(automation, new JSONObject(command.substring(6))));
                        else throw new IllegalArgumentException("Unknown probe command");
                    } catch (Exception error) {
                        response.put("error", error.getClass().getSimpleName() + ": " + error.getMessage());
                    }
                    output.write(response.toString() + "\n");
                    output.flush();
                } catch (java.io.IOException disconnected) {
                    // One host disconnect does not drop the accessibility service.
                }
            }
            finish(0, new Bundle());
        } catch (Exception error) {
            Bundle result = new Bundle();
            result.putString("probe_error", error.getClass().getSimpleName());
            finish(1, result);
        }
    }

    private AccessibilityNodeInfo activeRoot(UiAutomation automation) throws Exception {
        // Refresh the framework accessibility cache after WebView DOM changes.
        // A retained automation connection must not return a previous locale or
        // a previous screen's virtual nodes after a successful physical tap.
        automation.setServiceInfo(automation.getServiceInfo());
        try { automation.waitForIdle(100, 2000); }
        catch (java.util.concurrent.TimeoutException activeTimer) { /* query live UI */ }
        AccessibilityNodeInfo root = null;
        long deadline = SystemClock.uptimeMillis() + 15000;
        while (root == null && SystemClock.uptimeMillis() < deadline) {
            root = automation.getRootInActiveWindow();
            if (root != null && !root.refresh()) { root.recycle(); root = null; }
            if (root == null) SystemClock.sleep(250);
        }
        if (root == null) throw new IllegalStateException("null root after 15 seconds");
        return root;
    }

    private String hierarchy(UiAutomation automation) throws Exception {
        AccessibilityNodeInfo root = activeRoot(automation);
        StringWriter text = new StringWriter();
        XmlSerializer xml = Xml.newSerializer();
        xml.setOutput(text);
        xml.startTag(null, "hierarchy");
        try { node(xml, root, 0); } finally { root.recycle(); }
        xml.endTag(null, "hierarchy");
        xml.endDocument();
        return text.toString();
    }

    private boolean click(UiAutomation automation, JSONObject selector) throws Exception {
        if (selector.optString("class").isEmpty())
            throw new IllegalArgumentException("Action requires an exact node class");
        AccessibilityNodeInfo root = activeRoot(automation);
        List<AccessibilityNodeInfo> dialogs = new ArrayList<>();
        List<AccessibilityNodeInfo> matches = new ArrayList<>();
        try {
            visibleDialogs(root, dialogs, 0);
            AccessibilityNodeInfo scope = dialogs.isEmpty() ? root : dialogs.get(dialogs.size() - 1);
            matchingNodes(scope, selector, matches, 0);
            if (matches.size() != 1)
                throw new IllegalStateException("Action requires one visible target in the active dialog/window; got " + matches.size());
            return matches.get(0).performAction(AccessibilityNodeInfo.ACTION_CLICK);
        } finally {
            for (AccessibilityNodeInfo match : matches) match.recycle();
            for (AccessibilityNodeInfo dialog : dialogs) dialog.recycle();
            root.recycle();
        }
    }

    private void visibleDialogs(AccessibilityNodeInfo node, List<AccessibilityNodeInfo> result, int depth) {
        if (depth > 100) throw new IllegalStateException("Accessibility depth limit exceeded");
        if (node.isVisibleToUser() && "android.app.Dialog".contentEquals(string(node.getClassName())))
            result.add(AccessibilityNodeInfo.obtain(node));
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                try { visibleDialogs(child, result, depth + 1); } finally { child.recycle(); }
            }
        }
    }

    private void matchingNodes(AccessibilityNodeInfo node, JSONObject selector,
                               List<AccessibilityNodeInfo> result, int depth) {
        if (depth > 100) throw new IllegalStateException("Accessibility depth limit exceeded");
        if (node.isVisibleToUser() && node.isEnabled() && node.isClickable()
                && selector.optString("class").equals(string(node.getClassName()))
                && selector.optString("resource-id").equals(string(node.getViewIdResourceName()))
                && selector.optString("text").equals(string(node.getText()))
                && selector.optString("content-desc").equals(string(node.getContentDescription()))
                && selector.optString("hint").equals(string(node.getHintText())))
            result.add(AccessibilityNodeInfo.obtain(node));
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                try { matchingNodes(child, selector, result, depth + 1); } finally { child.recycle(); }
            }
        }
    }

    private String string(CharSequence value) { return value == null ? "" : value.toString(); }

    private void node(XmlSerializer xml, AccessibilityNodeInfo node, int depth) throws Exception {
        if (depth > 100) throw new IllegalStateException("Accessibility depth limit exceeded");
        xml.startTag(null, "node");
        attribute(xml, "text", node.getText());
        attribute(xml, "content-desc", node.getContentDescription());
        attribute(xml, "class", node.getClassName());
        attribute(xml, "package", node.getPackageName());
        attribute(xml, "resource-id", node.getViewIdResourceName());
        attribute(xml, "hint", node.getHintText());
        attribute(xml, "clickable", String.valueOf(node.isClickable()));
        attribute(xml, "enabled", String.valueOf(node.isEnabled()));
        attribute(xml, "scrollable", String.valueOf(node.isScrollable()));
        Rect bounds = new Rect();
        node.getBoundsInScreen(bounds);
        attribute(xml, "bounds", "[" + bounds.left + "," + bounds.top + "][" + bounds.right + "," + bounds.bottom + "]");
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                try { node(xml, child, depth + 1); } finally { child.recycle(); }
            }
        }
        xml.endTag(null, "node");
    }

    private void attribute(XmlSerializer xml, String name, CharSequence value) throws Exception {
        xml.attribute(null, name, value == null ? "" : value.toString());
    }
}
