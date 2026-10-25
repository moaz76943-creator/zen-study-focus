/**
 * DEEP FOCUS — Notes AutoSave & Durability Guard v21
 * Strictly prevents silent save failures, accidental editor closures on error,
 * and stale revision overwrites (Section 11 of Directive).
 */
(function(global) {
    const STORAGE_KEY_NOTES = "zen_fortress_notes_v21";
    let emergencyDraftMemory = null;

    function saveNoteSafely(candidateNote, existingNotesList, storageBackend) {
        if (!candidateNote || !candidateNote.id) {
            return { success: false, reason: "INVALID_NOTE_OBJECT", preserved: false };
        }

        // 1. Stale Version Conflict Check
        const existingIndex = existingNotesList.findIndex(n => n.id === candidateNote.id);
        if (existingIndex !== -1) {
            const current = existingNotesList[existingIndex];
            const candidateVer = Number(candidateNote.version) || 1;
            const currentVer = Number(current.version) || 1;

            if (candidateVer < currentVer) {
                return {
                    success: false,
                    reason: "STALE_VERSION_CONFLICT",
                    message: "A newer revision of this note already exists in storage.",
                    preservedText: true,
                    rejectedNote: candidateNote
                };
            }
        }

        // 2. Prepare merged list preserving all legacy/unknown fields intact
        const updatedList = [...existingNotesList];
        const updatedNote = {
            ...candidateNote,
            version: (Number(candidateNote.version) || 1) + 1,
            updatedAt: Date.now()
        };

        if (existingIndex !== -1) {
            // Merge preserving existing custom fields
            updatedList[existingIndex] = { ...existingNotesList[existingIndex], ...updatedNote };
        } else {
            updatedList.unshift(updatedNote);
        }

        // 3. Atomic Storage Execution with Emergency Fallback
        try {
            storageBackend.setItem(STORAGE_KEY_NOTES, JSON.stringify(updatedList));
            emergencyDraftMemory = null; // Clear emergency draft on proven success

            return {
                success: true,
                status: "PERSISTED",
                note: updatedNote,
                notesCount: updatedList.length
            };
        } catch (storageError) {
            // Storage Rejected: Retain candidate in emergency memory & prevent editor closure
            emergencyDraftMemory = {
                note: candidateNote,
                failedAt: Date.now(),
                error: storageError.message
            };

            return {
                success: false,
                status: "SAVE_REJECTED_DRAFT_RETAINED",
                reason: "STORAGE_BACKEND_REJECTED_WRITE",
                error: storageError.message,
                preservedText: true,
                message: "Text preserved in emergency memory buffer. Do not close editor."
            };
        }
    }

    function getEmergencyDraft() {
        return emergencyDraftMemory;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { saveNoteSafely, getEmergencyDraft, STORAGE_KEY_NOTES };
    } else {
        global.ZenNotesGuard = { saveNoteSafely, getEmergencyDraft, STORAGE_KEY_NOTES };
    }
})(typeof window !== 'undefined' ? window : globalThis);
