package com.zenstudy.focus;

import android.content.Context;
import android.util.AtomicFile;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/** Independent bounded AtomicFile receipt for the existing v21 active-timer packet.
 * The protected six native v21 data slots, their schema and Android package stay unchanged.
 */
final class NativeTimerPacketStore {
    private static final Object LOCK = new Object();
    private static final String NAME = "v21_active_timer_packets_v1";
    private static final int MAX_BYTES = 1024 * 1024;

    private static String legacyHash(String payload) {
        int hash = (int) 2166136261L;
        String source = payload + "ZEN_FORTRESS_V21_99812";
        for (int i = 0; i < source.length(); i++) {
            hash ^= source.charAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7)
                    + (hash << 8) + (hash << 24);
        }
        return Integer.toUnsignedString(hash, 16);
    }

    private static boolean validPacket(String raw) {
        if (raw == null || raw.length() < 8 || raw.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) return false;
        try {
            JSONObject p = new JSONObject(raw);
            if (!p.has("payload") || !p.has("sig") || !p.has("ts")) return false;
            String payload = p.getString("payload");
            if (!legacyHash(payload).equals(p.getString("sig"))) return false;
            JSONObject s = new JSONObject(payload);
            int total = s.getInt("total"), left = s.getInt("left");
            if (total < 1 || total > 86400 || left < 0 || left > 86400) return false;
            String mode = s.getString("mode");
            if (!("focus".equals(mode) || "short".equals(mode) ||
                  "long".equals(mode) || "custom".equals(mode))) return false;
            Object id = s.opt("sessionId");
            return id == null || id == JSONObject.NULL || id instanceof String;
        } catch (Exception invalid) { return false; }
    }

    private static String envelope(String primary, String mirror) {
        if (primary == null || !primary.equals(mirror) || !validPacket(primary)) return null;
        try {
            JSONObject doc = new JSONObject();
            doc.put("version", 1);
            doc.put("primary", primary);
            doc.put("mirror", mirror);
            String result = doc.toString();
            return result.getBytes(StandardCharsets.UTF_8).length <= MAX_BYTES * 2 + 512 ? result : null;
        } catch (Exception error) { return null; }
    }

    static boolean acknowledge(Context context, String primary, String mirror) {
        String receipt = envelope(primary, mirror);
        if (receipt == null) return false;
        byte[] bytes = receipt.getBytes(StandardCharsets.UTF_8);
        synchronized (LOCK) {
            AtomicFile file = new AtomicFile(new File(context.getFilesDir(), NAME));
            FileOutputStream stream = null;
            try {
                stream = file.startWrite();
                stream.write(bytes);
                stream.getFD().sync();
                file.finishWrite(stream);
                return true;
            } catch (Exception failure) {
                if (stream != null) file.failWrite(stream);
                return false;
            }
        }
    }

    static String read(Context context) {
        synchronized (LOCK) {
            AtomicFile file = new AtomicFile(new File(context.getFilesDir(), NAME));
            File base = file.getBaseFile();
            if (!base.exists() && !new File(base.getPath() + ".bak").exists()) return "NONE";
            try {
                byte[] bytes = file.readFully();
                if (bytes.length > MAX_BYTES * 2 + 512) return "ERROR";
                String raw = new String(bytes, StandardCharsets.UTF_8);
                JSONObject receipt = new JSONObject(raw);
                if (receipt.getInt("version") != 1 || receipt.length() != 3 ||
                    envelope(receipt.getString("primary"), receipt.getString("mirror")) == null) return "ERROR";
                return raw;
            } catch (Exception error) { return "ERROR"; }
        }
    }
}
