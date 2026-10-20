package com.zenstudy.focus;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** A successful return includes flush AND close; callers may acknowledge only then. */
final class NativeDocumentWriter {
    private NativeDocumentWriter() {}

    static void writeUtf8(OutputStream destination, String text) throws IOException {
        if (destination == null) throw new IOException("Document stream unavailable");
        try (OutputStream output = destination) {
            if (text == null || text.isEmpty()) throw new IOException("Empty export");
            output.write(text.getBytes(StandardCharsets.UTF_8));
            output.flush();
        }
    }
}
