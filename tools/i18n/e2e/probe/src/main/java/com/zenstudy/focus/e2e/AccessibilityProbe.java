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
                        if (!"DUMP".equals(command)) throw new IllegalArgumentException("Unknown probe command");
                        response.put("xml", hierarchy(automation));
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

    private String hierarchy(UiAutomation automation) throws Exception {
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
        StringWriter text = new StringWriter();
        XmlSerializer xml = Xml.newSerializer();
        xml.setOutput(text);
        xml.startTag(null, "hierarchy");
        try { node(xml, root, 0); } finally { root.recycle(); }
        xml.endTag(null, "hierarchy");
        xml.endDocument();
        return text.toString();
    }

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
