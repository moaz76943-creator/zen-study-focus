/* Deep Focus v21: display-only Audio/Settings locale namespace.
 * Lane 03 must load this file and call bindSoundStudio after each render.
 * No playback, storage, session or locale state is modified here.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DeepFocusAudioSettingsLocale = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const SOUND_IDS = Object.freeze([
    'ocean', 'rain', 'fire', 'forest', 'stream', 'leaves',
    'waterfall', 'night', 'thunder', 'wind', 'winrain', 'earth'
  ]);
  const SOUND_SET = new Set(SOUND_IDS);
  const PACKS = Object.freeze({
    en: {
      'control.play':'Play', 'control.pause':'Pause', 'control.stopAll':'Stop all',
      'control.volume':'Volume', 'control.volumeFor':'Volume for {sound}',
      'mix.ready':'Nature sounds ready', 'mix.preset':'Nature mix',
      'category.all':'All (12)', 'category.water':'Water & Rain',
      'category.forest':'Forest & Wind', 'category.warm':'Fire & Earth',
      'status.recordingUnavailable':'Local recording unavailable — synthesized ambience',
      'status.outputUnavailable':'Audio output unavailable',
      'settings.title':'Settings', 'settings.audio':'Nature sounds',
      'settings.alerts':'Session-end alerts', 'settings.volume':'Volume',
      'settings.mute':'Mute', 'settings.notification':'Notifications',
      'settings.backup':'Backup', 'settings.restore':'Restore',
      'settings.backupConfirm':'Export a backup of your local data?',
      'settings.restoreConfirm':'Restore selected backup? Current local data may be replaced.',
      'settings.restoreError':'Restore failed. Your existing data was not changed.',
      'settings.cancel':'Cancel', 'settings.save':'Save',
      'alert.silent':'Silent', 'alert.bell':'Bell', 'alert.wood':'Wood',
      'alert.water':'Water', 'alert.chime':'Chime', 'alert.doubleTap':'Double tap',
      'sound.ocean':'Ocean Waves', 'sound.rain':'Soft Forest Rain',
      'sound.fire':'Campfire Woods', 'sound.forest':'Pine Breeze',
      'sound.stream':'Mountain Stream', 'sound.leaves':'Rustling Leaves',
      'sound.waterfall':'Waterfall', 'sound.night':'Night Crickets',
      'sound.thunder':'Distant Thunder', 'sound.wind':'Highland Wind',
      'sound.winrain':'Rain on Window', 'sound.earth':'Deep Earth Rumble'
    },
    ar: {
      'control.play':'تشغيل', 'control.pause':'إيقاف مؤقت', 'control.stopAll':'إيقاف الكل',
      'control.volume':'مستوى الصوت', 'control.volumeFor':'مستوى صوت {sound}',
      'mix.ready':'أصوات الطبيعة جاهزة', 'mix.preset':'مزيج الطبيعة',
      'category.all':'الكل (12)', 'category.water':'المياه والأمطار',
      'category.forest':'الغابة والرياح', 'category.warm':'النار والأرض',
      'status.recordingUnavailable':'التسجيل المحلي غير متاح — تُستخدم مؤثرات طبيعية اصطناعية',
      'status.outputUnavailable':'خرج الصوت غير متاح',
      'settings.title':'الإعدادات', 'settings.audio':'أصوات الطبيعة',
      'settings.alerts':'تنبيهات نهاية الجلسة', 'settings.volume':'مستوى الصوت',
      'settings.mute':'كتم', 'settings.notification':'الإشعارات',
      'settings.backup':'نسخة احتياطية', 'settings.restore':'استعادة',
      'settings.backupConfirm':'هل تريد تصدير نسخة احتياطية من بياناتك المحلية؟',
      'settings.restoreConfirm':'هل تريد استعادة النسخة المختارة؟ قد تُستبدل البيانات المحلية الحالية.',
      'settings.restoreError':'فشلت الاستعادة. لم تتغير بياناتك الحالية.',
      'settings.cancel':'إلغاء', 'settings.save':'حفظ',
      'alert.silent':'صامت', 'alert.bell':'جرس', 'alert.wood':'خشب',
      'alert.water':'ماء', 'alert.chime':'رنين', 'alert.doubleTap':'نقرتان',
      'sound.ocean':'أمواج المحيط', 'sound.rain':'مطر الغابة الناعم',
      'sound.fire':'حطب المدفأة', 'sound.forest':'نسيم الصنوبر',
      'sound.stream':'جدول ماء جبلي', 'sound.leaves':'حفيف أوراق الشجر',
      'sound.waterfall':'شلال متدفق', 'sound.night':'صراصير الليل',
      'sound.thunder':'رعد بعيد', 'sound.wind':'رياح المرتفعات',
      'sound.winrain':'مطر على النافذة', 'sound.earth':'هدير الأرض'
    },
    de: {
      'control.play':'Abspielen', 'control.pause':'Pausieren', 'control.stopAll':'Alle stoppen',
      'control.volume':'Lautstärke', 'control.volumeFor':'Lautstärke für {sound}',
      'mix.ready':'Naturgeräusche bereit', 'mix.preset':'Naturklang-Mix',
      'category.all':'Alle (12)', 'category.water':'Wasser und Regen',
      'category.forest':'Wald und Wind', 'category.warm':'Feuer und Erde',
      'status.recordingUnavailable':'Lokale Aufnahme nicht verfügbar – synthetische Naturklänge',
      'status.outputUnavailable':'Audioausgabe nicht verfügbar',
      'settings.title':'Einstellungen', 'settings.audio':'Naturgeräusche',
      'settings.alerts':'Signale am Sitzungsende', 'settings.volume':'Lautstärke',
      'settings.mute':'Stummschalten', 'settings.notification':'Benachrichtigungen',
      'settings.backup':'Sicherung', 'settings.restore':'Wiederherstellen',
      'settings.backupConfirm':'Lokale Daten als Sicherung exportieren?',
      'settings.restoreConfirm':'Ausgewählte Sicherung wiederherstellen? Vorhandene lokale Daten können ersetzt werden.',
      'settings.restoreError':'Wiederherstellung fehlgeschlagen. Vorhandene Daten wurden nicht verändert.',
      'settings.cancel':'Abbrechen', 'settings.save':'Speichern',
      'alert.silent':'Lautlos', 'alert.bell':'Glocke', 'alert.wood':'Holz',
      'alert.water':'Wasser', 'alert.chime':'Gong', 'alert.doubleTap':'Doppeltippen',
      'sound.ocean':'Meereswellen', 'sound.rain':'Sanfter Waldregen',
      'sound.fire':'Lagerfeuer', 'sound.forest':'Kiefernwind',
      'sound.stream':'Gebirgsbach', 'sound.leaves':'Blätterrauschen',
      'sound.waterfall':'Wasserfall', 'sound.night':'Nachtgrillen',
      'sound.thunder':'Ferner Donner', 'sound.wind':'Bergwind',
      'sound.winrain':'Regen am Fenster', 'sound.earth':'Tiefes Erdrauschen'
    },
    es: {
      'control.play':'Reproducir', 'control.pause':'Pausar', 'control.stopAll':'Detener todo',
      'control.volume':'Volumen', 'control.volumeFor':'Volumen de {sound}',
      'mix.ready':'Sonidos de la naturaleza listos', 'mix.preset':'Mezcla natural',
      'category.all':'Todos (12)', 'category.water':'Agua y lluvia',
      'category.forest':'Bosque y viento', 'category.warm':'Fuego y tierra',
      'status.recordingUnavailable':'Grabación local no disponible — ambiente sintetizado',
      'status.outputUnavailable':'Salida de audio no disponible',
      'settings.title':'Ajustes', 'settings.audio':'Sonidos de la naturaleza',
      'settings.alerts':'Avisos de fin de sesión', 'settings.volume':'Volumen',
      'settings.mute':'Silenciar', 'settings.notification':'Notificaciones',
      'settings.backup':'Copia de seguridad', 'settings.restore':'Restaurar',
      'settings.backupConfirm':'¿Exportar una copia de seguridad de los datos locales?',
      'settings.restoreConfirm':'¿Restaurar la copia seleccionada? Podría reemplazar los datos locales actuales.',
      'settings.restoreError':'No se pudo restaurar. Los datos actuales no han cambiado.',
      'settings.cancel':'Cancelar', 'settings.save':'Guardar',
      'alert.silent':'Silencio', 'alert.bell':'Campana', 'alert.wood':'Madera',
      'alert.water':'Agua', 'alert.chime':'Carillón', 'alert.doubleTap':'Doble toque',
      'sound.ocean':'Olas del océano', 'sound.rain':'Lluvia suave del bosque',
      'sound.fire':'Fogata', 'sound.forest':'Brisa de pinos',
      'sound.stream':'Arroyo de montaña', 'sound.leaves':'Hojas susurrantes',
      'sound.waterfall':'Cascada', 'sound.night':'Grillos nocturnos',
      'sound.thunder':'Truenos lejanos', 'sound.wind':'Viento de montaña',
      'sound.winrain':'Lluvia en la ventana', 'sound.earth':'Rumor profundo de la tierra'
    },
    fr: {
      'control.play':'Lire', 'control.pause':'Pause', 'control.stopAll':'Tout arrêter',
      'control.volume':'Volume', 'control.volumeFor':'Volume de {sound}',
      'mix.ready':'Sons de la nature prêts', 'mix.preset':'Mix nature',
      'category.all':'Tous (12)', 'category.water':'Eau et pluie',
      'category.forest':'Forêt et vent', 'category.warm':'Feu et terre',
      'status.recordingUnavailable':'Enregistrement local indisponible — ambiance synthétisée',
      'status.outputUnavailable':'Sortie audio indisponible',
      'settings.title':'Paramètres', 'settings.audio':'Sons de la nature',
      'settings.alerts':'Alertes de fin de session', 'settings.volume':'Volume',
      'settings.mute':'Muet', 'settings.notification':'Notifications',
      'settings.backup':'Sauvegarde', 'settings.restore':'Restaurer',
      'settings.backupConfirm':'Exporter une sauvegarde des données locales ?',
      'settings.restoreConfirm':'Restaurer la sauvegarde choisie ? Les données locales peuvent être remplacées.',
      'settings.restoreError':'Échec de la restauration. Les données actuelles sont intactes.',
      'settings.cancel':'Annuler', 'settings.save':'Enregistrer',
      'alert.silent':'Silencieux', 'alert.bell':'Cloche', 'alert.wood':'Bois',
      'alert.water':'Eau', 'alert.chime':'Carillon', 'alert.doubleTap':'Double appui',
      'sound.ocean':'Vagues de l’océan', 'sound.rain':'Pluie douce en forêt',
      'sound.fire':'Feu de camp', 'sound.forest':'Brise de pins',
      'sound.stream':'Ruisseau de montagne', 'sound.leaves':'Feuilles froissées',
      'sound.waterfall':'Cascade', 'sound.night':'Grillons nocturnes',
      'sound.thunder':'Tonnerre lointain', 'sound.wind':'Vent des hauteurs',
      'sound.winrain':'Pluie sur la fenêtre', 'sound.earth':'Grondement de la terre'
    }
  });
  const KEYS = Object.freeze(Object.keys(PACKS.en));
  const ALIASES = Object.freeze({ 'he':'en', 'iw':'en', 'jw':'jv' });
  function localeCode(input) {
    const base = String(input || 'en').trim().toLowerCase().replace('_', '-').split('-')[0];
    return ALIASES[base] || base || 'en';
  }
  function metadata(locale) {
    const requested = localeCode(locale);
    const used = Object.prototype.hasOwnProperty.call(PACKS, requested) ? requested : 'en';
    return Object.freeze({ requested, used, complete: used === requested, fallback: used !== requested });
  }
  function translate(locale, key, vars) {
    if (!Object.prototype.hasOwnProperty.call(PACKS.en, key)) return '';
    const pack = PACKS[metadata(locale).used];
    const template = pack[key] || PACKS.en[key];
    return template.replace(/\{([a-z]+)\}/g, (token, name) =>
      vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : token);
  }
  function soundName(locale, id, legacy) {
    if (!SOUND_SET.has(id)) return '';
    const oldName = legacy && legacy.sounds && legacy.sounds[id];
    // A legacy catalog applies only when its locale is explicitly known to match.
    if (typeof oldName === 'string' && oldName.trim() &&
        localeCode(legacy.locale) === localeCode(locale)) return oldName;
    return translate(locale, 'sound.' + id);
  }
  function audioLabels(locale, id, legacy) {
    const name = soundName(locale, id, legacy);
    if (!name) return null;
    return Object.freeze({
      name, play: translate(locale, 'control.play'), pause: translate(locale, 'control.pause'),
      volume: translate(locale, 'control.volume'),
      volumeAria: translate(locale, 'control.volumeFor', {sound:name})
    });
  }
  function bindSoundStudio({ document: doc, locale, catalog, category = 'all', legacy } = {}) {
    const section = doc && typeof doc.getElementById === 'function' && doc.getElementById('sec-sounds');
    if (!section || !Array.isArray(catalog) || !catalog.every(s => s && SOUND_SET.has(s.id)))
      return {status:'SKIPPED', updated:0};
    const visible = catalog.filter(s => category === 'all' || s.cat === category);
    const tiles = [...section.querySelectorAll('.sound-Rich-tile')];
    if (tiles.length !== visible.length) return {status:'MISMATCH', updated:0};
    // Validate all DOM targets before performing any changes.
    const refs = tiles.map(tile => ({tile, name:tile.querySelector('.stile-name'),
      label:tile.querySelector('.stile-volume-label span'),
      slider:tile.querySelector('input.stile-vol')}));
    if (refs.some(x => !x.name || !x.label || !x.slider)) return {status:'INCOMPLETE', updated:0};
    refs.forEach((ref,i) => {
      const labels = audioLabels(locale, visible[i].id, legacy);
      ref.name.textContent = labels.name;
      ref.label.textContent = '🔉 ' + labels.volume;
      ref.slider.setAttribute('aria-label', labels.volumeAria);
      const isOn = ref.tile.classList && ref.tile.classList.contains('playing');
      ref.tile.setAttribute('aria-label', (isOn ? labels.pause : labels.play) + ': ' + labels.name);
    });
    const header = section.querySelector('#mixerStatusTxt');
    if (header) header.textContent = translate(locale, 'mix.ready');
    const actions = section.querySelectorAll('.mixer-status-bar button');
    if (actions.length === 2) {
      actions[0].textContent = translate(locale, 'mix.preset');
      actions[1].textContent = translate(locale, 'control.stopAll');
    }
    const filters = section.querySelectorAll('.segmented-pills-bar .seg-pill');
    if (filters.length === 4) ['all','water','forest','warm'].forEach((id,i) => {
      filters[i].textContent = translate(locale, 'category.' + id);
    });
    return {status:'OK', updated:refs.length, ...metadata(locale)};
  }
  return Object.freeze({SOUND_IDS, KEYS, PACKS, localeCode, metadata, translate,
    soundName, audioLabels, bindSoundStudio});
});
