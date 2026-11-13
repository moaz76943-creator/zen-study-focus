/**
 * DEEP FOCUS — Sovereign Encrypted Vault Backup & Restore Studio
 * Version: 439.0.0 (Build 41159)
 *
 * Capabilities:
 * - Air-gapped AES-GCM 256-bit encryption with PBKDF2 (100,000 iterations).
 * - Full snapshot aggregation (FSRS cards, Cornell notes, reader docs, syllabus).
 * - Client-side decryption and schema verification without cloud dependencies.
 * - Strict DOM sanitization, Zero PII, Western Digits (0123456789).
 */

(function (global) {
    'use strict';

    class SovereignEncryptedVaultStudio {
        constructor() {
            this.subtle = global.crypto ? global.crypto.subtle : null;
        }

        async deriveKey(passphrase, salt) {
            const enc = new TextEncoder();
            const keyMaterial = await this.subtle.importKey(
                'raw',
                enc.encode(passphrase),
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );

            return this.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
        }

        collectVaultData() {
            return {
                timestamp: Date.now(),
                version: '439.0.0',
                flashcards: JSON.parse(localStorage.getItem('df_flashcards_v1') || '[]'),
                notes: JSON.parse(localStorage.getItem('df_trizone_notes_v1') || '[]'),
                docs: JSON.parse(localStorage.getItem('df_reader_docs_v1') || '[]'),
                syllabus: JSON.parse(localStorage.getItem('df_syllabus_roadmap_v1') || '{}'),
                cognitiveHistory: JSON.parse(localStorage.getItem('df_cognitive_history_v1') || '[]')
            };
        }

        async createEncryptedBackup(passphrase) {
            if (!this.subtle) throw new Error('Web Crypto API is not supported in this runtime.');
            if (!passphrase || passphrase.length < 6) throw new Error('Passphrase must be at least 6 characters.');

            const dataObj = this.collectVaultData();
            const jsonStr = JSON.stringify(dataObj);
            const enc = new TextEncoder();
            const plainBytes = enc.encode(jsonStr);

            const salt = global.crypto.getRandomValues(new Uint8Array(16));
            const iv = global.crypto.getRandomValues(new Uint8Array(12));
            const key = await this.deriveKey(passphrase, salt);

            const cipherBuffer = await this.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                plainBytes
            );

            const payload = {
                seal: 'DF_SOVEREIGN_VAULT_V1',
                version: '439.0.0',
                timestamp: Date.now(),
                saltHex: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
                ivHex: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
                cipherBase64: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)))
            };

            return JSON.stringify(payload, null, 2);
        }

        async restoreFromEncryptedBackup(backupJsonStr, passphrase) {
            if (!this.subtle) throw new Error('Web Crypto API is not supported in this runtime.');
            const payload = typeof backupJsonStr === 'string' ? JSON.parse(backupJsonStr) : backupJsonStr;

            if (payload.seal !== 'DF_SOVEREIGN_VAULT_V1') {
                throw new Error('Invalid backup file format: Sovereign seal mismatch.');
            }

            const salt = new Uint8Array(payload.saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            const iv = new Uint8Array(payload.ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            const cipherBytes = Uint8Array.from(atob(payload.cipherBase64), c => c.charCodeAt(0));

            const key = await this.deriveKey(passphrase, salt);

            let decryptedBuffer;
            try {
                decryptedBuffer = await this.subtle.decrypt(
                    { name: 'AES-GCM', iv: iv },
                    key,
                    cipherBytes
                );
            } catch (err) {
                throw new Error('Decryption failed: Incorrect passphrase or corrupted vault file.');
            }

            const dec = new TextDecoder();
            const jsonStr = dec.decode(decryptedBuffer);
            const dataObj = JSON.parse(jsonStr, (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v);
            if (!dataObj || typeof dataObj !== 'object' || Array.isArray(dataObj)) throw new Error('Vault file has an invalid structure.');

            // 1) Validate every record BEFORE touching user data. 2) Snapshot. 3) Write and verify. 4) Roll back on any failure.
            const plan = [];
            const addArray = (field, key) => {
                if (dataObj[field] === undefined) return;
                if (!Array.isArray(dataObj[field])) throw new Error('Vault field "' + field + '" must be a list.');
                plan.push([key, JSON.stringify(dataObj[field])]);
            };
            addArray('flashcards', 'df_flashcards_v1');
            addArray('notes', 'df_trizone_notes_v1');
            addArray('docs', 'df_reader_docs_v1');
            if (dataObj.syllabus !== undefined) {
                if (!dataObj.syllabus || typeof dataObj.syllabus !== 'object' || Array.isArray(dataObj.syllabus)) throw new Error('Vault field "syllabus" must be an object.');
                plan.push(['df_syllabus_roadmap_v1', JSON.stringify(dataObj.syllabus)]);
            }
            addArray('cognitiveHistory', 'df_cognitive_history_v1');
            for (const [key, text] of plan) {
                if (typeof text !== 'string' || text.length > 2 * 1024 * 1024) throw new Error('Vault record too large: ' + key);
            }
            const snapshot = plan.map(([key]) => [key, localStorage.getItem(key)]);
            try {
                for (const [key, text] of plan) {
                    localStorage.setItem(key, text);
                    if (localStorage.getItem(key) !== text) throw new Error('STORAGE_WRITE_NOT_VERIFIED: ' + key);
                }
            } catch (err) {
                for (const [key, old] of snapshot) {
                    try { if (old === null) localStorage.removeItem(key); else localStorage.setItem(key, old); } catch (_) { /* best-effort rollback */ }
                }
                throw err;
            }

            return {
                success: true,
                restoredAt: Date.now(),
                cardsCount: (dataObj.flashcards || []).length,
                notesCount: (dataObj.notes || []).length,
                docsCount: (dataObj.docs || []).length
            };
        }

        renderBackupDom(containerId) {
            const mount = document.getElementById(containerId);
            if (!mount) return;

            mount.innerHTML = `
                <div class="df-vault-backup-card" style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-top:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #F3F4F6;padding-bottom:12px;margin-bottom:16px;">
                        <div>
                            <h3 style="margin:0;font-size:15px;font-weight:700;color:#111827;">✦ Sovereign Encrypted Vault Backup</h3>
                            <p style="margin:2px 0 0 0;font-size:12px;color:#6B7280;">AES-GCM 256-bit • PBKDF2 100k • Air-Gapped Zero-Cloud Snapshot</p>
                        </div>
                    </div>

                    <div style="grid-template-columns:1fr 1fr;display:grid;gap:16px;">
                        <div style="border:1px solid #E5E7EB;border-radius:8px;padding:14px;background:#FAFAFA;">
                            <h4 style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#111827;">Create Encrypted Vault</h4>
                            <p style="margin:0 0 10px 0;font-size:12px;color:#6B7280;">Secure all study records, flashcards, and notes with a master passphrase.</p>
                            <input type="password" id="dfBackupPassInput" placeholder="Master Passphrase (min 6 chars)" style="width:100%;box-sizing:border-box;padding:8px 10px;font-size:12px;border:1px solid #D1D5DB;border-radius:6px;margin-bottom:10px;" />
                            <button id="dfBackupExportBtn" style="padding:8px 14px;font-size:12px;background:#111827;color:#FFFFFF;border:none;border-radius:6px;font-weight:600;cursor:pointer;width:100%;">
                                Download .dfvault Backup ⇣
                            </button>
                        </div>

                        <div style="border:1px solid #E5E7EB;border-radius:8px;padding:14px;background:#FAFAFA;">
                            <h4 style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#111827;">Restore Encrypted Vault</h4>
                            <p style="margin:0 0 10px 0;font-size:12px;color:#6B7280;">Decrypt and restore a verified vault snapshot into your active workspace.</p>
                            <input type="password" id="dfRestorePassInput" placeholder="Passphrase for this backup" style="width:100%;box-sizing:border-box;padding:8px 10px;font-size:12px;border:1px solid #D1D5DB;border-radius:6px;margin-bottom:10px;" />
                            <label style="display:block;text-align:center;padding:8px 14px;font-size:12px;background:#FFFFFF;border:1px solid #D1D5DB;border-radius:6px;font-weight:600;color:#374151;cursor:pointer;">
                                Choose .dfvault File ⇡
                                <input type="file" id="dfRestoreFileInput" accept=".dfvault,.json" style="display:none;" />
                            </label>
                        </div>
                    </div>
                    <div id="dfBackupStatusMsg" style="margin-top:12px;font-size:12px;font-weight:600;display:none;"></div>
                </div>
            `;

            this.bindEvents(mount);
        }

        bindEvents(mount) {
            const exportBtn = mount.querySelector('#dfBackupExportBtn');
            const passInput = mount.querySelector('#dfBackupPassInput');
            const restoreFileInput = mount.querySelector('#dfRestoreFileInput');
            const restorePassInput = mount.querySelector('#dfRestorePassInput');
            const statusMsg = mount.querySelector('#dfBackupStatusMsg');

            if (exportBtn) {
                exportBtn.addEventListener('click', async () => {
                    const pass = passInput.value;
                    try {
                        const json = await this.createEncryptedBackup(pass);
                        const blob = new Blob([json], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `zen_study_backup_${Date.now()}.dfvault`;
                        a.click();
                        URL.revokeObjectURL(url);
                        passInput.value = '';
                        if (statusMsg) {
                            statusMsg.style.display = 'block';
                            statusMsg.style.color = '#059669';
                            statusMsg.textContent = '✓ Encrypted vault exported securely.';
                        }
                    } catch (err) {
                        if (statusMsg) {
                            statusMsg.style.display = 'block';
                            statusMsg.style.color = '#DC2626';
                            statusMsg.textContent = `❌ Export error: ${err.message}`;
                        }
                    }
                });
            }

            if (restoreFileInput) {
                restoreFileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const pass = restorePassInput.value;
                    const reader = new FileReader();
                    reader.onload = async (evt) => {
                        try {
                            const res = await this.restoreFromEncryptedBackup(evt.target.result, pass);
                            restorePassInput.value = '';
                            if (statusMsg) {
                                statusMsg.style.display = 'block';
                                statusMsg.style.color = '#059669';
                                statusMsg.textContent = `✓ Restore Successful! Recovered ${res.cardsCount} cards, ${res.notesCount} notes, ${res.docsCount} documents.`;
                            }
                        } catch (err) {
                            if (statusMsg) {
                                statusMsg.style.display = 'block';
                                statusMsg.style.color = '#DC2626';
                                statusMsg.textContent = `❌ Restore error: ${err.message}`;
                            }
                        }
                    };
                    reader.readAsText(file);
                });
            }
        }
    }

    const instance = new SovereignEncryptedVaultStudio();
    global.dfVaultBackup = instance;
    global.dfRenderVaultBackup = (mountId) => instance.renderBackupDom(mountId);

})(typeof window !== 'undefined' ? window : globalThis);
