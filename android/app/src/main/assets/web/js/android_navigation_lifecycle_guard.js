/**
 * DEEP FOCUS — Android Navigation & Lifecycle Guard v21
 * Enforces:
 * 1. 3-Layer Back Navigation: Dismiss modal -> Return to Timer (Home) -> Exit.
 * 2. IME Keyboard Resize Safety: Prevents editor blur or layout collapse.
 * 3. Seven Destinations Invariant: Timer is always the central home hub.
 */
(function(global) {

    const HOME_DESTINATION = "timer";
    const SEVEN_DESTINATIONS = ["tasks", "calendar", "notes", "timer", "training", "sounds", "analytics"];

    function handleAndroidBackPress(navigationState, uiState, callbacks = {}) {
        // Layer 1: Modal or Dialog is active
        if (uiState && uiState.hasOpenModal) {
            if (typeof callbacks.onCloseModal === 'function') {
                callbacks.onCloseModal(uiState.activeModalId);
            }
            return {
                action: "MODAL_DISMISSED",
                preventedExit: true,
                activeDestination: navigationState.currentDestination
            };
        }

        // Layer 2: Inside a secondary destination (Not on Home Timer)
        if (navigationState.currentDestination !== HOME_DESTINATION) {
            if (typeof callbacks.onNavigateToHome === 'function') {
                callbacks.onNavigateToHome(HOME_DESTINATION);
            }
            return {
                action: "NAVIGATED_TO_HOME_TIMER",
                preventedExit: true,
                activeDestination: HOME_DESTINATION
            };
        }

        // Layer 3: Already at Home Timer with no modals
        if (typeof callbacks.onAllowExit === 'function') {
            callbacks.onAllowExit();
        }
        return {
            action: "ALLOW_SYSTEM_EXIT",
            preventedExit: false,
            activeDestination: HOME_DESTINATION
        };
    }

    // Handles viewport resize when software keyboard opens/closes
    function handleImeResize(currentHeight, previousHeight, editorContext = {}) {
        const heightDelta = previousHeight - currentHeight;
        const isKeyboardAppearing = heightDelta > 150; // Standard mobile IME threshold

        return {
            keyboardVisible: isKeyboardAppearing,
            preventFullDomRebuild: true, // Invariant: Never rebuild DOM on IME event
            maintainScrollPosition: true,
            activeFieldId: editorContext.activeFieldId || null
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            handleAndroidBackPress,
            handleImeResize,
            HOME_DESTINATION,
            SEVEN_DESTINATIONS
        };
    } else {
        global.ZenAndroidNav = {
            handleAndroidBackPress,
            handleImeResize,
            HOME_DESTINATION,
            SEVEN_DESTINATIONS
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
