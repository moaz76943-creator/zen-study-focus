/**
 * DEEP FOCUS — Android Home Screen Widget State Synchronizer
 * Version: 437.0.0 (Build 41157)
 *
 * HONEST STATUS: this build ships NO Android AppWidgetProvider and the native bridge is
 * `ZenNative` (no `AndroidBridge`). The sync below is therefore a PREVIEW ONLY; it never
 * reaches a home-screen widget. `syncWidgetState` returns delivered:false unless a real
 * native hook exists.
 * Intended capabilities (not active in this build):
 * - Emits real-time study timer and FSRS card counts to Android AppWidgetProvider.
 * - Handles widget quick-launch intents (e.g., widget button click -> start session).
 * - Strict DOM sanitization, Zero PII, Western Digits (0123456789).
 */

(function (global) {
    'use strict';

    class SovereignWidgetSynchronizer {
        constructor() {
            this.dueCount = 0;
            this.activeTimeStr = '25:00';
            this.isRunning = false;
            this.initListeners();
        }

        initListeners() {
            global.dfOnWidgetActionTriggered = (action) => {
                if (action === 'TOGGLE_FOCUS') {
                    if (global.dfTileBridge && typeof global.dfTileBridge.toggleFocusSessionFromTile === 'function') {
                        global.dfTileBridge.toggleFocusSessionFromTile();
                    }
                }
            };
        }

        calculateDueCards() {
            try {
                const raw = localStorage.getItem('df_flashcards_v1');
                if (!raw) return 0;
                const cards = JSON.parse(raw);
                const now = Date.now();
                return cards.filter(c => (c.due || 0) <= now).length;
            } catch (e) {
                return 0;
            }
        }

        syncWidgetState(remainingSeconds, isRunning) {
            this.isRunning = !!isRunning;
            const mins = Math.floor((remainingSeconds || 0) / 60);
            const secs = (remainingSeconds || 0) % 60;
            this.activeTimeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            this.dueCount = this.calculateDueCards();

            // Dispatch to Android Native Bridge if present
            let delivered = false;
            if (global.AndroidBridge && typeof global.AndroidBridge.updateWidgetData === 'function') {
                try {
                    global.AndroidBridge.updateWidgetData(this.activeTimeStr, this.dueCount, this.isRunning);
                    delivered = true;
                } catch (_) { delivered = false; }
            }

            this.updateSimulatedDom();
            return { delivered: delivered, previewOnly: !delivered };
        }

        renderWidgetSimulatorDom(containerId) {
            const mount = document.getElementById(containerId);
            if (!mount) return;

            this.dueCount = this.calculateDueCards();

            mount.innerHTML = `
                <div class="df-widget-sim-card" style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-top:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #F3F4F6;padding-bottom:12px;margin-bottom:16px;">
                        <div>
                            <h3 style="margin:0;font-size:15px;font-weight:700;color:#111827;">✦ Widget Preview (no home-screen widget in this build)</h3>
                            <p style="margin:2px 0 0 0;font-size:12px;color:#6B7280;">RemoteViews Synchronization • FSRS Due Mirror • One-Tap Action</p>
                        </div>
                        <span style="font-size:11px;background:#F3F4F6;color:#374151;padding:4px 8px;border-radius:6px;font-family:monospace;">3x2 Cell</span>
                    </div>

                    <div style="display:flex;justify-content:center;padding:12px;background:#F9FAFB;border-radius:8px;">
                        <div style="width:220px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);text-align:center;">
                            <div style="font-size:10px;font-weight:800;letter-spacing:1px;color:#9CA3AF;">DEEP FOCUS</div>
                            <div id="dfWidgetSimTimer" style="font-size:32px;font-weight:800;color:#111827;margin:6px 0;font-variant-numeric:tabular-nums;">${this.activeTimeStr}</div>
                            <div id="dfWidgetSimDue" style="font-size:11px;color:#6B7280;margin-bottom:10px;">FSRS Due: ${this.dueCount} cards</div>
                            <button id="dfWidgetSimBtn" style="padding:6px 14px;font-size:11px;font-weight:700;background:#111827;color:#FFFFFF;border:none;border-radius:8px;cursor:pointer;width:100%;">
                                ${this.isRunning ? 'Pause Focus' : 'Focus Now'}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.bindEvents(mount);
        }

        bindEvents(mount) {
            const btn = mount.querySelector('#dfWidgetSimBtn');
            if (btn) {
                btn.addEventListener('click', () => {
                    if (global.dfTileBridge && typeof global.dfTileBridge.toggleFocusSessionFromTile === 'function') {
                        global.dfTileBridge.toggleFocusSessionFromTile();
                    }
                });
            }
        }

        updateSimulatedDom() {
            const timerEl = document.getElementById('dfWidgetSimTimer');
            const dueEl = document.getElementById('dfWidgetSimDue');
            const btn = document.getElementById('dfWidgetSimBtn');

            if (timerEl) timerEl.textContent = this.activeTimeStr;
            if (dueEl) dueEl.textContent = `FSRS Due: ${this.dueCount} cards`;
            if (btn) btn.textContent = this.isRunning ? 'Pause Focus' : 'Focus Now';
        }
    }

    const instance = new SovereignWidgetSynchronizer();
    global.dfWidgetSync = instance;
    global.dfRenderWidgetSimulator = (mountId) => instance.renderWidgetSimulatorDom(mountId);

})(typeof window !== 'undefined' ? window : globalThis);
