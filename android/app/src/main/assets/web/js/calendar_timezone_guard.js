/**
 * DEEP FOCUS — Calendar Timezone, DST & Leap Year Guard v21
 * Strictly eliminates:
 * 1. 24-Hour DST shift bugs (23h/25h transitions).
 * 2. Month overflow bugs (e.g. Jan 31 -> Mar 2).
 * 3. UTC timezone date sliding.
 */
(function(global) {

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }

    function getDaysInMonth(year, month) {
        // month is 1-based (1 = Jan, 12 = Dec)
        const days = [31, (isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        return days[month - 1];
    }

    function parseDateParts(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return null;
        const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;
        return {
            year: parseInt(match[1], 10),
            month: parseInt(match[2], 10),
            day: parseInt(match[3], 10)
        };
    }

    function formatDateParts(year, month, day) {
        const y = String(year).padStart(4, '0');
        const m = String(month).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // DST-safe Day Addition/Subtraction (Pure civil date arithmetic)
    function addDaysSafe(dateStr, deltaDays) {
        const parts = parseDateParts(dateStr);
        if (!parts) return null;

        let { year, month, day } = parts;
        day += deltaDays;

        while (day > getDaysInMonth(year, month)) {
            day -= getDaysInMonth(year, month);
            month += 1;
            if (month > 12) {
                month = 1;
                year += 1;
            }
        }

        while (day < 1) {
            month -= 1;
            if (month < 1) {
                month = 12;
                year -= 1;
            }
            day += getDaysInMonth(year, month);
        }

        return formatDateParts(year, month, day);
    }

    // Month Navigation with clamping to prevent overflow into subsequent month
    function addMonthsSafe(dateStr, deltaMonths) {
        const parts = parseDateParts(dateStr);
        if (!parts) return null;

        let { year, month, day } = parts;
        month += deltaMonths;

        while (month > 12) {
            month -= 12;
            year += 1;
        }
        while (month < 1) {
            month += 12;
            year -= 1;
        }

        const maxDaysInTargetMonth = getDaysInMonth(year, month);
        // Clamp to last day of month if original day exceeds it (e.g. Jan 31 -> Feb 28/29)
        if (day > maxDaysInTargetMonth) {
            day = maxDaysInTargetMonth;
        }

        return formatDateParts(year, month, day);
    }

    // Match tasks safely to calendar day without timezone leakage
    function getTasksForDate(tasksList, targetDateStr) {
        if (!Array.isArray(tasksList)) return [];
        return tasksList.filter(t => t && t.dueDate === targetDateStr);
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            isLeapYear,
            getDaysInMonth,
            parseDateParts,
            addDaysSafe,
            addMonthsSafe,
            getTasksForDate
        };
    } else {
        global.ZenCalendar = {
            isLeapYear,
            getDaysInMonth,
            parseDateParts,
            addDaysSafe,
            addMonthsSafe,
            getTasksForDate
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
