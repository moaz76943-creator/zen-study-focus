/**
 * DEEP FOCUS — Unified Studio Navigator & Bottom Drawer
 * Module: modules/ui/studio_navigator_drawer.js
 * Version: v469.0.0
 * Architecture: Clean Floating Trigger + AMOLED Bottom Sheet + Tactile Touch
 * Consolidates all 10 studios into a single, elegant bottom drawer.
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.StudioNavigatorDrawer = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const studiosList = [
        { id: "sanctuary", name: "المحمية التفاعلية", desc: "Sanctuary Garden & Starlight", icon: "🌌" },
        { id: "theme", name: "استوديو الثيمات AMOLED", desc: "True Black & Sunset Auto", icon: "🎨" },
        { id: "wrapped", name: "قصة المذاكرة السنوية", desc: "Study Wrapped & Stats", icon: "📊" },
        { id: "pods", name: "غرف المذاكرة المحلية", desc: "Local Serverless Pods", icon: "👥" },
        { id: "rescue", name: "بروتوكول ليلة الامتحان", desc: "Exam-Eve Rescue & Sleep Cutoff", icon: "🛡️" },
        { id: "leaderboard", name: "لوحة الأرقام القياسية", desc: "Personal Best & Ghost Pacer", icon: "🏆" },
        { id: "contracts", name: "عقود الالتزام بالتركيز", desc: "Cryptographic Commitment", icon: "📜" },
        { id: "i18n", name: "محرك اللغات العالمي", desc: "10 Languages Safe i18n", icon: "🌐" },
        { id: "accessibility", name: "إمكانية الوصول الشاملة", desc: "TalkBack AAA & Colorblind", icon: "♿" },
        { id: "performance", name: "محرك الأداء 120Hz", desc: "WebWorkers & 8.3ms Frames", icon: "⚡" }
    ];

    const StudioNavigatorDrawer = {
        isOpen: false,

        init: function () {
            if (typeof document === "undefined") return;
            this.injectFloatingTrigger();
            this.injectDrawerSheet();
            console.log("[StudioNavigator] Initialized with 10 consolidated studios.");
        },

        injectFloatingTrigger: function () {
            if (document.getElementById("zenStudioTriggerPill")) return;

            const pill = document.createElement("button");
            pill.id = "zenStudioTriggerPill";
            pill.className = "interactive-action";
            pill.setAttribute("aria-label", "فتح لوحة الاستوديوهات والأدوات");
            pill.style.position = "fixed";
            pill.style.bottom = "20px";
            pill.style.left = "50%";
            pill.style.transform = "translateX(-50%)";
            pill.style.background = "rgba(18, 18, 18, 0.85)";
            pill.style.backdropFilter = "blur(12px)";
            pill.style.border = "1px solid rgba(255, 255, 255, 0.15)";
            pill.style.borderRadius = "28px";
            pill.style.padding = "10px 22px";
            pill.style.color = "#ffffff";
            pill.style.fontSize = "0.92rem";
            pill.style.fontWeight = "600";
            pill.style.cursor = "pointer";
            pill.style.zIndex = "9000";
            pill.style.display = "flex";
            pill.style.alignItems = "center";
            pill.style.gap = "8px";
            pill.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.6)";

            pill.innerHTML = '<span>✨ الاستوديوهات</span> <span style="opacity: 0.5; font-size: 0.75rem;">(10)</span>';

            pill.onclick = () => {
                this.toggleDrawer();
            };

            document.body.appendChild(pill);
        },

        injectDrawerSheet: function () {
            if (document.getElementById("zenStudioDrawerOverlay")) return;

            const overlay = document.createElement("div");
            overlay.id = "zenStudioDrawerOverlay";
            overlay.style.position = "fixed";
            overlay.style.top = "0";
            overlay.style.left = "0";
            overlay.style.width = "100vw";
            overlay.style.height = "100vh";
            overlay.style.background = "rgba(0, 0, 0, 0.75)";
            overlay.style.backdropFilter = "blur(10px)";
            overlay.style.zIndex = "9500";
            overlay.style.display = "none";
            overlay.style.opacity = "0";
            overlay.style.transition = "opacity 0.25s ease";

            overlay.onclick = (e) => {
                if (e.target === overlay) this.closeDrawer();
            };

            const sheet = document.createElement("div");
            sheet.id = "zenStudioDrawerSheet";
            sheet.style.position = "absolute";
            sheet.style.bottom = "0";
            sheet.style.left = "0";
            sheet.style.width = "100%";
            sheet.style.maxHeight = "80vh";
            sheet.style.background = "#050505";
            sheet.style.borderTop = "1px solid rgba(255, 255, 255, 0.12)";
            sheet.style.borderTopLeftRadius = "24px";
            sheet.style.borderTopRightRadius = "24px";
            sheet.style.padding = "24px 20px 40px";
            sheet.style.overflowY = "auto";
            sheet.style.color = "#fff";

            let itemsHtml = "";
            studiosList.forEach(s => {
                itemsHtml += '<div class="studio-card interactive-action" data-studio="' + s.id + '" style="display: flex; align-items: center; gap: 14px; background: #121212; border: 1px solid #222; border-radius: 14px; padding: 14px 16px; margin-bottom: 10px; cursor: pointer;"><span style="font-size: 1.6rem;">' + s.icon + '</span><div style="flex: 1;"><div style="font-weight: 600; font-size: 0.98rem;">' + s.name + '</div><div style="font-size: 0.8rem; color: #888;">' + s.desc + '</div></div><span style="color: #555; font-size: 1.1rem;">›</span></div>';
            });

            sheet.innerHTML = '<div style="width: 40px; height: 4px; background: #333; border-radius: 2px; margin: 0 auto 18px;"></div><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;"><h3 style="margin: 0; font-size: 1.2rem;">✨ استوديوهات DEEP FOCUS</h3><button id="zenCloseDrawerBtn" style="background: transparent; border: none; color: #888; font-size: 1.2rem; cursor: pointer;">✕</button></div><div>' + itemsHtml + '</div>';

            overlay.appendChild(sheet);
            document.body.appendChild(overlay);

            document.getElementById("zenCloseDrawerBtn").onclick = () => {
                this.closeDrawer();
            };

            // Card click handlers
            const cards = sheet.querySelectorAll(".studio-card");
            cards.forEach(c => {
                c.onclick = () => {
                    const sid = c.getAttribute("data-studio");
                    this.launchStudio(sid);
                };
            });
        },

        toggleDrawer: function () {
            if (this.isOpen) this.closeDrawer();
            else this.openDrawer();
        },

        openDrawer: function() {
            if (window.UniversalI18nHotSwap && window.UniversalI18nHotSwap.activeDictionary) { window.UniversalI18nHotSwap.sweepDom(window.UniversalI18nHotSwap.activeDictionary); }
            const overlay = document.getElementById("zenStudioDrawerOverlay");
            if (!overlay) return;
            overlay.style.display = "block";
            setTimeout(() => { overlay.style.opacity = "1"; }, 10);
            this.isOpen = true;
            if (typeof navigator !== "undefined" && navigator.vibrate) try { ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate(20) : false); } catch (e) {}
        },

        closeDrawer: function () {
            const overlay = document.getElementById("zenStudioDrawerOverlay");
            if (!overlay) return;
            overlay.style.opacity = "0";
            setTimeout(() => { overlay.style.display = "none"; }, 250);
            this.isOpen = false;
        },

        launchStudio: function (studioId) {
            console.log("[StudioNavigator] Launching studio:", studioId);
            this.closeDrawer();
            if (typeof navigator !== "undefined" && navigator.vibrate) try { ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate(25) : false); } catch (e) {}
            
            // Trigger specific studio modal or view if present
            const targetModal = document.getElementById(studioId + "StudioModal") || document.getElementById(studioId + "Modal");
            if (targetModal) {
                targetModal.style.display = "flex";
            } else {
                alert("تم تفعيل: " + studioId);
            }
        }
    };

    return StudioNavigatorDrawer;
}));
