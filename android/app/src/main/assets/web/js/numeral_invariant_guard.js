/**
 * DEEP FOCUS — Western Digits (0-9) & RTL Invariant Guard v21
 * Enforces strict Western Arabic numerals for all system-generated strings
 * across all 20 locales (including ar, fa, ur) while safeguarding user text.
 */
(function(global) {
    const EASTERN_TO_WESTERN_MAP = {
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
        '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
        '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
        '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
    };

    const EASTERN_DIGITS_REGEX = /[٠-٩۰-۹]/g;

    function sanitizeToWesternDigits(str) {
        if (typeof str !== 'string') return String(str);
        return str.replace(EASTERN_DIGITS_REGEX, match => EASTERN_TO_WESTERN_MAP[match] || match);
    }

    // Format timer seconds to strict MM:SS or HH:MM:SS with LTR mark to prevent Bidi inversion in RTL
    function formatTimerDisplay(totalSeconds) {
        const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
        const hours = Math.floor(sec / 3600);
        const minutes = Math.floor((sec % 3600) / 60);
        const seconds = sec % 60;

        const pad = (n) => String(n).padStart(2, '0');
        
        let formatted = `${pad(minutes)}:${pad(seconds)}`;
        if (hours > 0) {
            formatted = `${pad(hours)}:${formatted}`;
        }

        // Prepend and append Left-to-Right Mark (\u200E) to guarantee strict LTR rendering in RTL views
        return `\u200E${formatted}\u200E`;
    }

    // Format percentage strictly as Western digits (e.g., "100%")
    function formatPercentage(value) {
        const num = Math.round(Number(value) || 0);
        return `\u200E${num}%\u200E`;
    }

    // Format date stamp strictly as YYYY-MM-DD
    function formatDateStamp(dateObj) {
        const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Invariant check: Confirms string contains ONLY Western digits for numerical segments
    function containsOnlyWesternDigits(str) {
        if (typeof str !== 'string') return false;
        return !EASTERN_DIGITS_REGEX.test(str);
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            sanitizeToWesternDigits,
            formatTimerDisplay,
            formatPercentage,
            formatDateStamp,
            containsOnlyWesternDigits
        };
    } else {
        global.ZenNumerals = {
            sanitizeToWesternDigits,
            formatTimerDisplay,
            formatPercentage,
            formatDateStamp,
            containsOnlyWesternDigits
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
