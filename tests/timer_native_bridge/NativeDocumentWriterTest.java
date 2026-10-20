package com.zenstudy.focus;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

public final class NativeDocumentWriterTest {
    private static final class Sink extends ByteArrayOutputStream {
        boolean closed;
        String failure;
        Sink(String failure) { this.failure = failure; }
        @Override public void write(byte[] bytes, int offset, int length) {
            if ("write".equals(failure)) throw new IllegalStateException("Fixture storage full");
            super.write(bytes, offset, length);
        }
        @Override public void flush() throws IOException {
            if ("flush".equals(failure)) throw new IOException("Fixture flush failure");
        }
        @Override public void close() throws IOException {
            closed = true;
            if ("close".equals(failure)) throw new IOException("Fixture closed provider");
        }
    }
    public static void main(String[] ignored) throws Exception {
        String text = "عنوان,وقت\n\"Unicode ١٢, note\",25\n";
        Sink good = new Sink(null);
        NativeDocumentWriter.writeUtf8(good, text);
        if (!good.closed || !text.equals(new String(good.toByteArray(), StandardCharsets.UTF_8)))
            throw new AssertionError("UTF8/close not verified");
        for (String failure : new String[]{"write", "flush", "close"}) {
            Sink bad = new Sink(failure);
            boolean acknowledged = false;
            try { NativeDocumentWriter.writeUtf8(bad, text); acknowledged = true; }
            catch (IOException | IllegalStateException expected) { /* No saved acknowledgement. */ }
            if (acknowledged || !bad.closed) throw new AssertionError(failure);
        }
        for (String empty : new String[]{null, ""}) {
            Sink sink = new Sink(null);
            try { NativeDocumentWriter.writeUtf8(sink, empty); throw new AssertionError("Empty export accepted"); }
            catch (IOException expected) { if (!sink.closed) throw new AssertionError("Stream leaked"); }
        }
        try { NativeDocumentWriter.writeUtf8(null, text); throw new AssertionError("Null stream accepted"); }
        catch (IOException expected) { /* Provider unavailable. */ }
        System.out.println("PASS: native UTF-8 export, write/flush/close failure, empty/null stream (7 cases)");
    }
}
