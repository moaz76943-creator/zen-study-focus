package com.zenstudy.focus;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.Iterator;

/** Pure, bounded native completion-token policy; never mutates a caller's set. */
final class NativeCompletionLedger {
    private NativeCompletionLedger() {}

    static LinkedHashSet<String> add(Set<String> old, String sessionId, int limit) {
        if (sessionId == null || sessionId.isEmpty() || limit < 1)
            throw new IllegalArgumentException("Invalid native session completion token");
        LinkedHashSet<String> next = new LinkedHashSet<>(old);
        next.add(sessionId);
        while (next.size() > limit) {
            Iterator<String> it = next.iterator();
            if (!it.hasNext()) break;
            it.next();
            it.remove();
        }
        return next;
    }
}
