/**
 * DEEP FOCUS — Gitleaks Report Security Validator v21
 * Enforces the 5-state result model and strictly redacts secret contents.
 */
const fs = require('fs');

function parseAndAuditGitleaksReport(reportPath, exitCode = 0) {
    // 1. Scanner Runtime Failure
    if (exitCode !== 0 && exitCode !== 1) {
        return {
            status: "BLOCKED_SCANNER_ERROR",
            clean: false,
            reason: `Gitleaks scanner exited with abnormal error code: ${exitCode}`
        };
    }

    // 2. Missing Report File
    if (!fs.existsSync(reportPath)) {
        return {
            status: "BLOCKED_MISSING_REPORT",
            clean: false,
            reason: `Expected Gitleaks report file not found at: ${reportPath}`
        };
    }

    // 3. Parse & Validate Report Structure
    let findings;
    try {
        const rawContent = fs.readFileSync(reportPath, 'utf8').trim();
        findings = JSON.parse(rawContent);
    } catch {
        return {
            status: "BLOCKED_MALFORMED_REPORT",
            clean: false,
            // JSON parser errors can include snippets containing secret values.
            reason: "Malformed JSON in Gitleaks report"
        };
    }

    if (!Array.isArray(findings)) {
        return {
            status: "BLOCKED_MALFORMED_REPORT",
            clean: false,
            reason: "Gitleaks report root must be an array of findings"
        };
    }

    if (findings.some(finding => finding === null || typeof finding !== "object" || Array.isArray(finding))) {
        return {
            status: "BLOCKED_MALFORMED_REPORT",
            clean: false,
            reason: "Gitleaks findings must be objects"
        };
    }

    // 4. Verified Clean Report
    if (findings.length === 0) {
        if (exitCode !== 0) {
            return {
                status: "BLOCKED_SCANNER_ERROR",
                clean: false,
                reason: "Gitleaks findings exit conflicts with an empty report"
            };
        }
        return {
            status: "PASS",
            clean: true,
            findingsCount: 0,
            summary: "No secrets detected. Repository clean."
        };
    }

    // 5. Findings Detected: Sanitize and redact to prevent leaking in CI logs
    const sanitizedFindings = findings.map(f => ({
        ruleID: f.RuleID || "UnknownRule",
        file: f.File || "UnknownFile",
        startLine: f.StartLine || 0,
        secret: "[REDACTED_SECURITY_POLICY]" // Strictly redact secret text
    }));

    return {
        status: "FAIL",
        clean: false,
        findingsCount: sanitizedFindings.length,
        findings: sanitizedFindings,
        reason: `Gitleaks detected ${sanitizedFindings.length} potential secret(s). Remediation required.`
    };
}

module.exports = { parseAndAuditGitleaksReport };
