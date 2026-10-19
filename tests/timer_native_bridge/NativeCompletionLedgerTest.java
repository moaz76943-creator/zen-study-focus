package com.zenstudy.focus;

import java.util.Collections;
import java.util.LinkedHashSet;

public final class NativeCompletionLedgerTest {
    private static void require(boolean b, String message) {
        if (!b) throw new AssertionError(message);
    }

    public static void main(String[] args) {
        LinkedHashSet<String> one = NativeCompletionLedger.add(Collections.emptySet(), "session-1", 3);
        require(one.contains("session-1"), "first completed session is retained");
        require(one.size() == 1, "first session inserted once");
        LinkedHashSet<String> retry = NativeCompletionLedger.add(one, "session-1", 3);
        require(retry.size() == 1, "same session never becomes a second entry");
        require(one.size() == 1, "original shared preferences set is not modified");
        LinkedHashSet<String> two = NativeCompletionLedger.add(retry, "session-2", 3);
        LinkedHashSet<String> three = NativeCompletionLedger.add(two, "session-3", 3);
        LinkedHashSet<String> four = NativeCompletionLedger.add(three, "session-4", 3);
        require(four.size() == 3, "ledger remains bounded");
        require(!four.contains("session-1"), "oldest token evicted");
        require(four.contains("session-4"), "latest completed session is retained");
        require(three.contains("session-1"), "prior state remains immutable");
        boolean rejected = false;
        try { NativeCompletionLedger.add(four, "", 3); }
        catch (IllegalArgumentException ok) { rejected = true; }
        require(rejected, "empty identifiers are rejected");
        System.out.println("PASS NativeCompletionLedgerTest: bounded tokens, dedupe, immutable history");
    }
}
