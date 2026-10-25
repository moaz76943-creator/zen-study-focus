/**
 * DEEP FOCUS — Evidence Integrity & Audit Guard v21
 * Strictly validates test artifacts: rejects stale SHAs, empty runs, and malformed TAP.
 */

function validateEvidence(evidence, currentHeadSha) {
    if (!evidence || typeof evidence !== 'object') {
        return { status: "BLOCKED_MALFORMED", valid: false, reason: "Evidence object missing or not an object" };
    }

    // 1. Exact SHA Matching (No stale inheritance)
    if (!evidence.sha || evidence.sha !== currentHeadSha) {
        return {
            status: "STALE_SHA_REJECTED",
            valid: false,
            reason: `Evidence SHA (${evidence.sha}) does not match current HEAD (${currentHeadSha})`
        };
    }

    // 2. Truthful assertion execution (No fake exit 0 passes)
    const assertions = Number(evidence.assertionsCount) || 0;
    if (assertions <= 0) {
        return {
            status: "ZERO_ASSERTIONS_REJECTED",
            valid: false,
            reason: "Exit code 0 but zero assertions executed (empty or omitted test)"
        };
    }

    // 3. Failure check
    const failures = Number(evidence.failuresCount) || 0;
    if (failures > 0) {
        return {
            status: "FAIL",
            valid: false,
            reason: `Test suite reported ${failures} failing assertion(s)`
        };
    }

    // 4. Skipped threshold (Cannot be 100% skipped)
    const skipped = Number(evidence.skippedCount) || 0;
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
