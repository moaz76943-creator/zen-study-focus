# Batch 06 — confirmed exports and localized time units

BASE_SHA: 12e96c1
ISSUES_FIXED (scoped source behavior): DF-075/078/082/059/060/062/065/131, DF4-008/009/020/028/033.

Clipboard actions for manual backup, all-note TXT and sharing now await the real platform acknowledgement, catch denied/unavailable APIs and suppress concurrent duplicate requests. They no longer show success merely on click. Arabic failure and backup-privacy text is explicit; manual ZEN21:: remains readable data, not encryption.

Native CSV and backup share a small UTF-8 writer that returns only after write, flush and close succeed. Backup's success Toast was inside try-with-resources (before close) and could falsely precede a close failure; it is now after the verified writer. Repeated backup picker requests cannot replace the in-flight payload. No storage schema, permissions, source origin or signing settings changed.

Generated timer minutes/seconds now use Intl unit formatting with numberingSystem latn, tested localized fallbacks for all 20 languages, and no rewriting of authored text. Rest 45s and +1 Set controls follow the chosen training language; custom session titles retain authored digits. Presets distinguish seconds from minutes. English smoke expectations now assert readable “minutes” instead of obsolete “m”. This is not an assertion that every other label is translated.

TEST_COMMANDS: node --test tests/integration_recovery/clipboard_ack.test.cjs tests/ascii_numerals/duration_units.test.cjs; node tests/smoke_app.cjs; java -m jdk.compiler/com.sun.tools.javac.Main -d /workspace/scratch/completion-evidence/native-unit android/app/src/main/java/com/zenstudy/focus/NativeDocumentWriter.java tests/timer_native_bridge/NativeDocumentWriterTest.java; java -cp /workspace/scratch/completion-evidence/native-unit com.zenstudy.focus.NativeDocumentWriterTest.
TEST_RESULTS: clipboard 2 PASS; duration formatting/fallback 2 PASS; native JVM 7 failure/success cases PASS; smoke PASS; WebView security 7 PASS. The local JDK has compiler modules but no javac launcher, so the compiler module was invoked directly. CI uses Java17/javac and must compile the real Android integration.
ACTUAL_ANDROID_TESTS: NOT_TESTED for SAF, provider errors, permission/cancel UI and these latest code changes. JVM stream tests are not Android picker tests.
NEXT_BATCH: final integrated regression, task-by-task evidence ledger, APK from final SHA and Android loading diagnostics.
