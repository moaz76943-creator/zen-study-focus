/**
 * DEEP FOCUS — Tasks Studio Durability & Optional Dates Guard v21
 * Enforces:
 * 1. Strictly Optional Due Dates: Never fabricate a default date for undated tasks.
 * 2. Zero Field Stripping: Preserves legacy/unknown attributes, repeat rules, and subtasks.
 * 3. Accurate Filtering: Undated tasks never leak into 'overdue' or 'today'.
 */
(function(global) {
    const STORAGE_KEY_TASKS = "zen_fortress_tasks_v21";

    function sanitizeDueDate(dueDateInput) {
        if (!dueDateInput || typeof dueDateInput !== 'string' || dueDateInput.trim() === "") {
            return null; // Strictly null, never auto-filled with today's date
        }
        return dueDateInput.trim();
    }

    function saveOrUpdateTask(candidateTask, existingTasksList, storageBackend) {
        if (!candidateTask || !candidateTask.id) {
            return { success: false, reason: "INVALID_TASK_OBJECT" };
        }

        const existingIndex = existingTasksList.findIndex(t => t.id === candidateTask.id);
        const updatedList = [...existingTasksList];

        let finalTask;
        if (existingIndex !== -1) {
            const original = existingTasksList[existingIndex];
            
            // Merge preserving ALL unknown/legacy fields from original
            finalTask = {
                ...original,
                ...candidateTask,
                // If user didn't explicitly pass a new valid date, preserve original or keep null
                dueDate: (candidateTask.dueDate !== undefined) 
                    ? sanitizeDueDate(candidateTask.dueDate) 
                    : (original.dueDate || null),
                updatedAt: Date.now()
            };
            updatedList[existingIndex] = finalTask;
        } else {
            finalTask = {
                ...candidateTask,
                dueDate: sanitizeDueDate(candidateTask.dueDate),
                createdAt: candidateTask.createdAt || Date.now(),
                updatedAt: Date.now()
            };
            updatedList.unshift(finalTask);
        }

        try {
            storageBackend.setItem(STORAGE_KEY_TASKS, JSON.stringify(updatedList));
            return {
                success: true,
                status: "TASK_PERSISTED",
                task: finalTask,
                totalTasks: updatedList.length
            };
        } catch (e) {
            return {
                success: false,
                status: "STORAGE_FAILED",
                error: e.message
            };
        }
    }

    function categorizeTask(task, referenceDateStr) {
        if (task.completed || task.isCompleted) {
            return "completed";
        }
        if (!task.dueDate) {
            return "no_date"; // Backlog / Someday
        }
        if (task.dueDate === referenceDateStr) {
            return "today";
        }
        if (task.dueDate < referenceDateStr) {
            return "overdue";
        }
        return "upcoming";
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { saveOrUpdateTask, sanitizeDueDate, categorizeTask, STORAGE_KEY_TASKS };
    } else {
        global.ZenTasksGuard = { saveOrUpdateTask, sanitizeDueDate, categorizeTask, STORAGE_KEY_TASKS };
    }
})(typeof window !== 'undefined' ? window : globalThis);
