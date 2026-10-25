/**
 * DEEP FOCUS — Agent Test Suite Ownership Guard v21
 * Strictly guarantees:
 * 1. Zero Duplicate Owners: Every test file is owned by exactly ONE agent.
 * 2. Zero Orphan Tests: Every test in the project is tracked by an agent.
 */

function auditOwnership(agentsRegistry, existingTestFiles) {
    const fileToOwners = new Map();
    const registeredFiles = new Set();
    const duplicateErrors = [];

    // Map files to owners
    for (const [agentName, agentConfig] of Object.entries(agentsRegistry)) {
        const suites = agentConfig.testSuites || [];
        for (const suite of suites) {
            registeredFiles.add(suite);
            if (!fileToOwners.has(suite)) {
                fileToOwners.set(suite, []);
            }
            fileToOwners.get(suite).push(agentName);
        }
    }

    // 1. Check for Duplicate Owners
    for (const [suite, owners] of fileToOwners.entries()) {
        if (owners.length > 1) {
            duplicateErrors.push({
                suite,
                owners,
                reason: `Test suite is owned by multiple agents: ${owners.join(', ')}`
            });
        }
    }

    if (duplicateErrors.length > 0) {
        return {
            status: "FAIL_DUPLICATE_OWNERS",
            valid: false,
            duplicates: duplicateErrors
        };
    }

    // 2. Check for Orphan Tests
    const orphans = existingTestFiles.filter(f => !registeredFiles.has(f));
    if (orphans.length > 0) {
        return {
            status: "FAIL_ORPHAN_TESTS",
            valid: false,
            orphans,
            reason: `Found test suites without a designated specialist agent owner: ${orphans.join(', ')}`
        };
    }

    return {
        status: "PASS",
        valid: true,
        totalTrackedSuites: registeredFiles.size,
        totalAgents: Object.keys(agentsRegistry).length
    };
}

module.exports = { auditOwnership };
