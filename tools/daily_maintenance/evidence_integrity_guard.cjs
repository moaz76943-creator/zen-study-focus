/**
 * DEEP FOCUS — Evidence Integrity & Audit Guard v21
 * Strictly validates test artifacts: rejects stale SHAs, empty runs, and malformed TAP.
 */

function validateEvidence(evidence, currentHeadSha) {
    // Reject missing, non‑object, or array‑shaped evidence early
    if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
        return {
            status: "BLOCKED_MALFORMED",
            valid: false,
            reason: "Evidence object missing, not an object, or is an array"
        };
    }

    // 1. Exact SHA Matching (No stale inheritance)
    if (!evidence.sha || evidence.sha !== currentHeadSha) {
        return {
            status: "STALE_SHA_REJECTED",
            valid: false,
            reason: `Evidence SHA (${evidence.sha}) does not match current HEAD (${currentHeadSha})`
        };
    }

    // 2. Fail closed on malformed or inconsistent measurements before any PASS.
    // Do not coerce strings/NaN/Infinity/missing fields into valid counters.
    const counts = ['assertionsCount', 'failuresCount', 'skippedCount'];
    if (counts.some(key => !Number.isSafeInteger(evidence[key]) || evidence[key] < 0)) {
        return {
            status: "BLOCKED_MALFORMED",
            valid: false,
            reason: "Evidence counters must be present as nonnegative safe integers"
        };
    }
    const assertions = evidence.assertionsCount;
    const failures = evidence.failuresCount;
    const skipped = evidence.skippedCount;
    if (failures > assertions || skipped > assertions || failures + skipped > assertions) {
        return {
            status: "BLOCKED_MALFORMED",
            valid: false,
            reason: "Evidence failure/skip totals exceed assertions"
        };
    }
    if (assertions <= 0) {
        return {
            status: "ZERO_ASSERTIONS_REJECTED",
            valid: false,
            reason: "Exit code 0 but zero assertions executed (empty or omitted test)"
        };
    }

    // 3. Failure check
    if (failures > 0) {
        return {
            status: "FAIL",
            valid: false,
            reason: `Test suite reported ${failures} failing assertion(s)`
        };
    }

    // 4. Skipped threshold (Cannot be 100% skipped)
    if (skipped >= assertions) {
        return {
            status: "ALL_SKIPPED_REJECTED",
            valid: false,
            reason: "All assertions were skipped"
        };
    }

    return {
        status: "PASS",
        valid: true,
        sha: evidence.sha,
        verifiedAssertions: assertions
    };
}

module.exports = { validateEvidence };
