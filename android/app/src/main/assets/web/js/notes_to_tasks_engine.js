/**
 * DEEP FOCUS — Notes-to-Tasks Workflow Engine v21
 * Extracts checklist action items from notes and instantiates linked tasks.
 * Strictly maintains note text fidelity and optional due date invariants.
 */
(function(global) {

    // Regex matching markdown checklists: '- [ ] item', '* [ ] item', or '[ ] item'
    const CHECKLIST_REGEX = /^(?:[-*]\s*)?\[\s*\]\s+(.+)$/gm;

    function extractActionItemsFromNote(note) {
        if (!note || !note.body || typeof note.body !== 'string') {
            return [];
        }

        const items = [];
        const lines = note.body.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(/^(?:[-*]\s*)?\[\s*\]\s+(.+)$/);
            if (match && match[1]) {
                items.push({
                    lineNumber: i + 1,
                    rawText: line,
                    taskTitle: match[1].trim()
                });
            }
        }

        return items;
    }

    function convertActionItemToTask(actionItem, sourceNote, options = {}) {
        if (!actionItem || !actionItem.taskTitle || !sourceNote || !sourceNote.id) {
            return { success: false, reason: "INVALID_PARAMETERS" };
        }

        const newTask = {
            id: `task_from_note_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            title: actionItem.taskTitle,
            dueDate: options.dueDate || null, // Optional due date invariant
            sourceNoteId: sourceNote.id,      // Relational link to parent note
            completed: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        return {
            success: true,
            task: newTask,
            sourceNoteId: sourceNote.id
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            extractActionItemsFromNote,
            convertActionItemToTask
        };
    } else {
        global.ZenNotesToTasks = {
            extractActionItemsFromNote,
            convertActionItemToTask
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
