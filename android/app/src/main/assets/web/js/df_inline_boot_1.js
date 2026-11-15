(function () {
      function wireAllInteractiveButtons() {
        if (window.UniversalI18nHotSwap && window.UniversalI18nHotSwap.sweepDom) {
          window.UniversalI18nHotSwap.sweepDom();
        }
        var buttons = document.querySelectorAll('button, [role="button"]');
        buttons.forEach(function (btn) {
          if (btn.getAttribute('data-806-wired')) return;
          var txt = (btn.textContent || '').trim().toLowerCase();
          var i18nKey = btn.getAttribute('data-i18n') || '';

          if (txt.indexOf('test sound') !== -1 || txt.indexOf('preview') !== -1 || i18nKey === 'ui_test_sound' || i18nKey === 'ui_preview') {
            btn.setAttribute('data-806-wired', '1');
            btn.addEventListener('click', function () {
              if (window.SovereignAudioCues) window.SovereignAudioCues.playBell();
            });
          } else if (txt.indexOf('water & rain') !== -1 || i18nKey === 'soundRain') {
            btn.setAttribute('data-806-wired', '1');
            btn.addEventListener('click', function () {
              if (window.SovereignAudioCues) window.SovereignAudioCues.playAmbient('rain');
            });
          } else if (txt.indexOf('forest & wind') !== -1 || i18nKey === 'soundForest') {
            btn.setAttribute('data-806-wired', '1');
            btn.addEventListener('click', function () {
              if (window.SovereignAudioCues) window.SovereignAudioCues.playAmbient('forest');
            });
          } else if (txt.indexOf('fire & earth') !== -1 || i18nKey === 'soundWaves') {
            btn.setAttribute('data-806-wired', '1');
            btn.addEventListener('click', function () {
              if (window.SovereignAudioCues) window.SovereignAudioCues.playAmbient('water');
            });
          } else if (txt.indexOf('mix') !== -1 || txt.indexOf('3d spatial') !== -1 || i18nKey === 'ui_mix' || i18nKey === 'ui_3d_spatial') {
            btn.setAttribute('data-806-wired', '1');
            btn.addEventListener('click', function () {
              if (window.SovereignAudioCues) window.SovereignAudioCues.mixAmbient();
            });
          } else if (txt.indexOf('stop') !== -1 || i18nKey === 'ui_stop') {
            btn.setAttribute('data-806-wired', '1');
            btn.addEventListener('click', function () {
              if (window.SovereignAudioCues) window.SovereignAudioCues.stopAmbient();
            });
          } else if (txt.indexOf('manual backup') !== -1 || i18nKey === 'ui_manual_backup') {
            btn.setAttribute('data-806-wired', '1');
            btn.addEventListener('click', function () {
              if (window.SovereignDataVault && window.SovereignDataVault.exportToClipboard) {
                window.SovereignDataVault.exportToClipboard();
              }
            });
          }
        });
      }

      document.addEventListener('DOMContentLoaded', function () {
        wireAllInteractiveButtons();
        if (typeof MutationObserver !== 'undefined' && document.body) {
          var debounceTimer = null;
          var obs = new MutationObserver(function () {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
              wireAllInteractiveButtons();
            }, 120);
          });
          obs.observe(document.body, { childList: true, subtree: true });
        }
      });
    })();
