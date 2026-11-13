/**
 * DEEP FOCUS — Cognitive Load Profiler & Flow State Studio
 * Version: 438.0.0 (Build 41158)
 *
 * Capabilities:
 * - Local-only telemetry tracking cognitive velocity (FSRS card latencies, reading WPM).
 * - Generates smooth SVG Flow State Curves (Deep Work vs Fatigue Threshold).
 * - Prescribes dynamic pacing shifts (Active Recall -> Procedural Noise Rest).
 * - Strict DOM sanitization, Zero PII, Western Digits (0123456789).
 */

(function (global) {
    'use strict';

    class CognitiveLoadProfiler {
        constructor() {
            this.history = this.loadHistory();
        }

        loadHistory() {
            try {
                const raw = localStorage.getItem('df_cognitive_history_v1');
                if (!raw) return this.getSeedHistory();
                const parsed = JSON.parse(raw);
                if (!Array.isArray(parsed)) return this.getSeedHistory();
                // Validate every stored entry: finite 0-100 score, known velocity label.
                const VEL = ['OPTIMAL', 'STEADY', 'RISING', 'FALLING', 'FATIGUED', 'LOW', 'HIGH'];
                const clean = parsed.slice(-30).filter(e => e && typeof e === 'object' && Number.isFinite(Number(e.score)))
                    .map(e => Object.assign({}, e, {
                        score: Math.max(0, Math.min(100, Math.round(Number(e.score)))),
                        velocity: VEL.indexOf(String(e.velocity)) >= 0 ? String(e.velocity) : 'OPTIMAL'
                    }));
                return clean.length ? clean : this.getSeedHistory();
            } catch (e) {
                return this.getSeedHistory();
            }
        }

        saveHistory() {
            try {
                localStorage.setItem('df_cognitive_history_v1', JSON.stringify(this.history));
            } catch (e) {
                console.error('[CognitiveProfiler] Save error', e);
            }
        }

        getSeedHistory() {
            const now = Date.now();
            return [
                { timestamp: now - 3600000 * 4, score: 78, velocity: 'OPTIMAL', sessionType: 'Flashcards' },
                { timestamp: now - 3600000 * 3, score: 85, velocity: 'DEEP_FLOW', sessionType: 'RSVP Reader' },
                { timestamp: now - 3600000 * 2, score: 92, velocity: 'PEAK_CLARITY', sessionType: 'Cornell Notes' },
                { timestamp: now - 3600000 * 1, score: 68, velocity: 'MILD_FATIGUE', sessionType: 'STEM Derivations' },
                { timestamp: now, score: 82, velocity: 'RESTORED', sessionType: 'Soundscape Rest' }
            ];
        }

        recordMetric(sessionType, latencyMs, accuracyRatio) {
            let score = 75;
            if (latencyMs < 2500 && accuracyRatio > 0.85) score = 95;
            else if (latencyMs < 4000 && accuracyRatio > 0.70) score = 85;
            else if (latencyMs > 7000 || accuracyRatio < 0.60) score = 55;

            let velocity = 'OPTIMAL';
            if (score >= 90) velocity = 'PEAK_CLARITY';
            else if (score >= 80) velocity = 'DEEP_FLOW';
            else if (score <= 60) velocity = 'FATIGUE_BUFFER';

            this.history.push({
                timestamp: Date.now(),
                score: score,
                velocity: velocity,
                sessionType: sessionType || 'Study'
            });

            if (this.history.length > 30) this.history.shift();
            this.saveHistory();
        }

        generateFlowSvg(width, height) {
            width = width || 480;
            height = height || 140;
            if (this.history.length < 2) return '';

            const points = [];
            const n = this.history.length;
            const stepX = (width - 40) / (n - 1);

            for (let i = 0; i < n; i++) {
                const x = 20 + i * stepX;
                const score = this.history[i].score;
                const y = height - 20 - ((score / 100) * (height - 40));
                points.push({ x, y });
            }

            let pathD = `M ${points[0].x} ${points[0].y}`;
            for (let i = 1; i < points.length; i++) {
                const prev = points[i - 1];
                const curr = points[i];
                const midX = (prev.x + curr.x) / 2;
                pathD += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
            }

            let dots = '';
            points.forEach((p, idx) => {
                const item = this.history[idx];
                const fill = item.score >= 80 ? '#059669' : (item.score >= 65 ? '#111827' : '#D97706');
                dots += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${fill}" stroke="#FFFFFF" stroke-width="2"/>`;
            });

            return `
                <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:${height}px;overflow:visible;">
                    <line x1="20" y1="${height - 20}" x2="${width - 20}" y2="${height - 20}" stroke="#E5E7EB" stroke-width="1"/>
                    <line x1="20" y1="${height / 2}" x2="${width - 20}" y2="${height / 2}" stroke="#F3F4F6" stroke-dasharray="4 4" stroke-width="1"/>
                    <path d="${pathD}" fill="none" stroke="#111827" stroke-width="2.5" stroke-linecap="round"/>
                    ${dots}
                </svg>
            `;
        }

        renderProfilerDom(containerId) {
            const mount = document.getElementById(containerId);
            if (!mount) return;

            const rawLatest = this.history[this.history.length - 1] || { score: 80, velocity: 'OPTIMAL' };
            const latest = {
                score: Number.isFinite(Number(rawLatest.score)) ? Math.max(0, Math.min(100, Math.round(Number(rawLatest.score)))) : 80,
                velocity: String(rawLatest.velocity || 'OPTIMAL').replace(/[^A-Z_]/g, '').slice(0, 16) || 'OPTIMAL'
            };
            const svgMarkup = this.generateFlowSvg(480, 130);

            mount.innerHTML = `
                <div class="df-cognitive-profiler-card" style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-top:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #F3F4F6;padding-bottom:12px;margin-bottom:16px;">
                        <div>
                            <h3 style="margin:0;font-size:15px;font-weight:700;color:#111827;">✦ Cognitive Flow & Pacing Sentinel</h3>
                            <p style="margin:2px 0 0 0;font-size:12px;color:#6B7280;">Velocity Curve • Dynamic Load-Balancing • Burnout Shield</p>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:18px;font-weight:800;color:#111827;font-variant-numeric:tabular-nums;">${latest.score} / 100</div>
                            <div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;">${latest.velocity}</div>
                        </div>
                    </div>

                    <div style="background:#FAFAFA;border:1px solid #F3F4F6;border-radius:8px;padding:12px;margin-bottom:14px;">
                        ${svgMarkup}
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB;">
                        <span style="font-size:12px;color:#4B5563;">Current Recommendation:</span>
                        <span style="font-size:12px;font-weight:700;color:#111827;">
                            ${latest.score >= 80 ? '✦ Engage High-Yield STEM or Feynman Recall' : '☾ Shift to Procedural Soundscape or Zen Garden'}
                        </span>
                    </div>
                </div>
            `;
        }
    }

    const instance = new CognitiveLoadProfiler();
    global.dfCognitiveProfiler = instance;
    global.dfRenderCognitiveProfiler = (mountId) => instance.renderProfilerDom(mountId);

})(typeof window !== 'undefined' ? window : globalThis);
