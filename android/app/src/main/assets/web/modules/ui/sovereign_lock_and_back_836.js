(function (global) {
  "use strict";

  function enforceLockBadgeContrast() {
    if (typeof document === "undefined") return;
    var isDark = document.body && (document.body.classList.contains("dark-mode") || document.body.classList.contains("dark"));
    var fg = isDark ? "#F8FAFC" : "#0F172A";
    var bg = isDark ? "#1E293B" : "#F1F5F9";
    var border = isDark ? "#475569" : "#CBD5E1";

    var candidates = document.querySelectorAll("button, .pill, .chip, .badge, a, span, div");
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (!el || el.children.length > 4) continue;
      var txt = (el.textContent || "").trim();
      if (!txt || txt.length > 40) continue;
      if (txt.indexOf("🔒") !== -1 || txt === "Local Data" || txt === "بيانات محلية") {
        var target = el.closest("button, .pill, .chip, .badge, a") || el;
        target.style.setProperty("color", fg, "important");
        target.style.setProperty("background-color", bg, "important");
        target.style.setProperty("border", "1px solid " + border, "important");
        target.style.setProperty("opacity", "1", "important");
        var inner = target.querySelectorAll("*");
        for (var j = 0; j < inner.length; j++) {
          inner[j].style.setProperty("color", fg, "important");
          inner[j].style.setProperty("opacity", "1", "important");
        }
      }
    }
  }

  function closeTopOpenModal() {
    if (typeof document === "undefined") return false;
    var modals = document.querySelectorAll('.modal, [role="dialog"], [id*="Modal"], [id*="modal"]');
    var closed = false;
    for (var i = modals.length - 1; i >= 0; i--) {
      var m = modals[i];
      var st = global.getComputedStyle ? global.getComputedStyle(m) : null;
      if (st && st.display !== "none" && st.visibility !== "hidden") {
        var closeBtn = m.querySelector('.modal-close, button[aria-label="Close"], [data-close]');
        if (closeBtn && typeof closeBtn.click === "function") {
          closeBtn.click();
        } else {
          m.style.display = "none";
          m.classList.remove("open", "active", "show");
        }
        closed = true;
        break;
      }
    }
    return closed;
  }

  if (typeof document !== "undefined" && !global.__ZEN_LOCK_BACK_836__) {
    global.__ZEN_LOCK_BACK_836__ = true;
    document.addEventListener("DOMContentLoaded", function () {
      enforceLockBadgeContrast();
      setTimeout(enforceLockBadgeContrast, 350);
    });
    document.addEventListener("click", function () {
      setTimeout(enforceLockBadgeContrast, 120);
    }, true);
    global.addEventListener("popstate", function () {
      closeTopOpenModal();
    });
  }

  global.SovereignLockAndBack = {
    enforceLockBadgeContrast: enforceLockBadgeContrast,
    closeTopOpenModal: closeTopOpenModal
  };
})(typeof window !== "undefined" ? window : globalThis);
