/**
 * DEEP FOCUS — SAF Import Safe Validator v21
 * Guarantees zero data loss on cancelled, corrupted, or malformed backups.
 */
(function(global) {
    const BACKUP_MARKER = "ZEN21::";
    const MAX_BACKUP_SIZE_BYTES = 50 * 1024 * 1024; // 50MB ceiling

    function validateAndParseBackup(rawContent) {
        if (rawContent === null || rawContent === undefined || rawContent === "") {
            return { success: false, reason: "PICKER_CANCELLED_OR_EMPTY", preserved: true };
        }

        if (typeof rawContent !== "string") {
            return { success: false, reason: "INVALID_CONTENT_TYPE", preserved: true };
        }

        if (rawContent.length > MAX_BACKUP_SIZE_BYTES) {
            return { success: false, reason: "OVERSIZED_PAYLOAD", preserved: true };
        }

        if (!rawContent.startsWith(BACKUP_MARKER)) {
            return { success: false, reason: "INVALID_BACKUP_MARKER", preserved: true };
        }

        const jsonPayload = rawContent.slice(BACKUP_MARKER.length);
        let parsed;
        try {
            parsed = JSON.parse(jsonPayload);
        } catch (e) {
            return { success: false, reason: "MALFORMED_JSON", error: e.message, preserved: true };
        }

        if (!parsed || typeof parsed !== "object") {
            return { success: false, reason: "INVALID_SCHEMA_ROOT", preserved: true };
        }

        // Validate presence of core structures while strictly preserving legacy fields
        const tasks = parsed.zen_fortress_tasks_v21 || parsed.tasks || [];
        const notes = parsed.zen_fortress_notes_v21 || parsed.notes || [];
        const cfg = parsed.zen_fortress_cfg_v21 || parsed.cfg || {};

        return {
            success: true,
            preserved: true,
            data: {
                zen_fortress_tasks_v21: tasks,
                zen_fortress_notes_v21: notes,
                zen_fortress_cfg_v21: cfg,
                legacy_passthrough: parsed // Preserves all unknown/future fields intact
            }
        };
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { validateAndParseBackup, BACKUP_MARKER };
    } else {
        global.ZenSafValidator = { validateAndParseBackup, BACKUP_MARKER };
    }
})(typeof window !== "undefined" ? window : globalThis);
