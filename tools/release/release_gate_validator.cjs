/**
 * DEEP FOCUS — Release Gates & Artifact Validator v21
 * Strictly enforces Section 48 & 62:
 * 1. Default RELEASE_APPROVED = NO.
 * 2. Rejects Debug AAB as Play-Ready.
 * 3. Enforces Package ID: com.zenstudy.focus.
 */

function auditReleaseGate(buildMetadata, humanApproval = false) {
    const EXPECTED_PACKAGE_ID = "com.zenstudy.focus";

    if (!buildMetadata || typeof buildMetadata !== 'object') {
        return { approved: false, status: "BLOCKED_METADATA_MISSING", reason: "Missing build metadata" };
    }

    // 1. Package ID Check
    if (buildMetadata.packageId !== EXPECTED_PACKAGE_ID) {
        return {
            approved: false,
            status: "FAIL_PACKAGE_MISMATCH",
            reason: `Invalid Package ID: ${buildMetadata.packageId} (Expected: ${EXPECTED_PACKAGE_ID})`
        };
    }

    // 2. Reject Debug AAB from being treated as Store Release
    if (buildMetadata.buildType === "DEBUG_AAB" || buildMetadata.signingState === "DEBUG_KEYSTORE") {
        return {
            approved: false,
            status: "REJECTED_DEBUG_ARTIFACT",
            reason: "Debug-signed AAB cannot be submitted to Google Play production."
        };
    }

    // 3. Human Release Approval Gate (Section 62)
    if (!humanApproval) {
        return {
            approved: false,
            status: "BLOCKED_AWAITING_HUMAN_APPROVAL",
            reason: "RELEASE_APPROVED=NO is the default invariant until explicit developer sign-off."
        };
    }

    // 4. Check for Verified Production Signature & SHA256
    if (buildMetadata.buildType === "RELEASE_AAB" && buildMetadata.signingState === "PROD_SIGNED" && buildMetadata.sha256) {
        return {
            approved: true,
            status: "RELEASE_APPROVED_FOR_STAGING",
            packageId: EXPECTED_PACKAGE_ID,
            versionCode: buildMetadata.versionCode,
            sha256: buildMetadata.sha256
        };
    }

    return {
        approved: false,
        status: "FAIL_UNVERIFIED_SIGNING_STATE",
        reason: "Artifact lacks production signing or SHA256 receipt."
    };
}

module.exports = { auditReleaseGate };
