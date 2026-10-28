"""Execute the actual Java ACK body against documented AtomicFile fault behavior.

Source-level Java fault model only: this is NOT Android device acceptance.
Envelope validation is intentionally outside this focused disk-publication test.
"""
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'android/app/src/main/java/com/zenstudy/focus/MainActivity.java'


def java_method(signature):
    source = SOURCE.read_text()
    start = source.index(signature)
    opening = source.index('{', start)
    depth = 1
    end = opening + 1
    while depth:
        depth += (source[end] == '{') - (source[end] == '}')
        end += 1
    return source[start:end]


HARNESS = r'''
import java.io.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
public class NativeAckFaultHarness {
    final Object durableV21Lock = new Object();
    final int MAX_DURABLE_V21_BYTES = 1024 * 1024;
    final File directory;
    NativeAckFaultHarness(File directory) { this.directory = directory; }
    File getFilesDir() { return directory; }
    boolean validV21Envelope(String json) { return true; } // Validation is a separate contract.
    ACK_METHOD
    READ_METHOD
    public static void main(String[] args) throws Exception {
        File directory = new File(args[1]);
        File base = new File(directory, "v21_durable_packets_v1");
        if (!args[0].equals("silent-first"))
            Files.write(base.toPath(), "previous".getBytes(StandardCharsets.UTF_8));
        AtomicFile.mode = args[0];
        boolean ack = new NativeAckFaultHarness(directory).acknowledgeDurableV21("new receipt");
        System.out.println(ack);
        System.out.println(base.exists() ? new String(Files.readAllBytes(base.toPath()),StandardCharsets.UTF_8) : "ABSENT");
        if (args[0].equals("readback-rollback-failure"))
            System.out.println(new NativeAckFaultHarness(directory).readDurableV21());
    }
}
// AtomicFile.finishWrite logs rename/sync failure without throwing. Model that
// behavior while executing the actual production ACK method and real host fsync.
class AtomicFile {
    static String mode;
    final File base, staged;
    AtomicFile(File base) { this.base = base; this.staged = new File(base.getPath()+".new"); }
    File getBaseFile() { return base; }
    void delete() { base.delete(); staged.delete(); }
    boolean published = false;
    FileOutputStream startWrite() throws IOException {
        if (mode.equals("rollback-failure")) throw new IOException("cannot restore receipt");
        if (mode.equals("interrupted")) throw new IOException("fault before publication");
        return new FileOutputStream(staged);
    }
    void finishWrite(FileOutputStream output) throws IOException {
        output.close();
        if (mode.startsWith("silent")) return;
        Files.move(staged.toPath(),base.toPath(),StandardCopyOption.REPLACE_EXISTING);
        published = true;
    }
    byte[] readFully() throws IOException {
        if (mode.equals("initial-read-failure")) throw new IOException("prior receipt unreadable");
        if (published && mode.startsWith("readback-")) {
            mode=mode.equals("readback-rollback-failure")?"rollback-failure":"publish";
            throw new IOException("injected readback error after publication");
        }
        return Files.readAllBytes(base.toPath());
    }
    void failWrite(FileOutputStream output) {
        try { output.close(); } catch (IOException ignored) {}
        staged.delete();
    }
}
'''


class NativeAtomicAckTest(unittest.TestCase):
    def execute(self, mode):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'NativeAckFaultHarness.java'
            source.write_text(HARNESS.replace('ACK_METHOD', java_method('public boolean acknowledgeDurableV21(String json)')).replace('READ_METHOD',java_method('public String readDurableV21()')))
            result = subprocess.run(['java',str(source),mode,directory],text=True,
                                    capture_output=True,check=True,timeout=30)
            return result.stdout.strip().splitlines()

    def test_silent_publish_failure_cannot_acknowledge_stale_previous_receipt(self):
        self.assertEqual(self.execute('silent-stale'),['false','previous'])

    def test_silent_first_publish_failure_cannot_acknowledge_missing_receipt(self):
        self.assertEqual(self.execute('silent-first'),['false','ABSENT'])

    def test_readback_failure_after_publication_restores_previous_receipt(self):
        self.assertEqual(self.execute('readback-failure'),['false','previous'])

    def test_initial_read_failure_never_deletes_previous_receipt(self):
        self.assertEqual(self.execute('initial-read-failure'),['false','previous'])

    def test_failed_rollback_blocks_replay_of_rejected_edit(self):
        self.assertEqual(self.execute('readback-rollback-failure'),['false','new receipt','ERROR'])

    def test_success_acknowledges_exact_published_bytes(self):
        self.assertEqual(self.execute('publish'),['true','new receipt'])

    def test_interruption_preserves_previous_receipt_without_ack(self):
        self.assertEqual(self.execute('interrupted'),['false','previous'])
