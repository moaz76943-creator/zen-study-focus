package com.zenstudy.focus;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** No receipt until close succeeds and independently reopened bytes match exactly. */
final class NativeCsvWriter {
    static final int MAX_BYTES = 4 * 1024 * 1024;
    interface Document {
        OutputStream openOutput() throws IOException;
        InputStream openInput() throws IOException;
    }
    static void writeAndVerify(Document document, String csv) throws IOException {
        byte[] expected = csv.getBytes(StandardCharsets.UTF_8);
        if (expected.length > MAX_BYTES) throw new IOException("CSV exceeds limit");
        try (OutputStream output = document.openOutput()) {
            if (output == null) throw new IOException("No output stream");
            output.write(expected);
            output.flush();
        }
        try (InputStream input = document.openInput()) {
            if (input == null) throw new IOException("No readback stream");
            byte[] chunk = new byte[8192];
            int offset = 0, count;
            while ((count = input.read(chunk)) != -1) {
                if (count == 0) throw new IOException("Readback stalled");
                if (count > expected.length - offset) throw new IOException("Readback length mismatch");
                for (int i = 0; i < count; i++)
                    if (chunk[i] != expected[offset + i]) throw new IOException("Readback mismatch");
                offset += count;
            }
            if (offset != expected.length) throw new IOException("Truncated readback");
        }
    }
}
