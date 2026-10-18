import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
HTML = (ROOT / "android/app/src/main/assets/web/index.html").read_text(encoding="utf-8")
APP = (ROOT / "android/app/src/main/assets/web/app.js").read_text(encoding="utf-8")
QUICK = (ROOT / "android/app/src/main/assets/web/quick_training.js").read_text(encoding="utf-8")


class HomeLayoutRegression(unittest.TestCase):
    def test_timer_is_first_content_before_domain_or_metrics(self):
        timer_start = HTML.index('id="sec-timer"')
        focus = HTML.index('id="focusHeroCard"', timer_start)
        domains = HTML.index('class="domain-pedestal-grid"', timer_start)
        shortcuts = HTML.index('id="homeQuick10"', timer_start)
        training = HTML.index('id="quickTrainingCard"', timer_start)
        metrics = HTML.index('class="pure-white-card quick-orbs-card"', timer_start)
        self.assertLess(timer_start, focus)
        self.assertLess(focus, domains)
        self.assertLess(domains, shortcuts)
        self.assertLess(shortcuts, training)
        self.assertLess(training, metrics)
        self.assertIn('id="timerRingBar"', HTML[focus:domains])
        self.assertIn('id="mainPlayBtn"', HTML[focus:domains])

    def test_all_six_original_navigation_and_screens_remain(self):
        for key in ("timer", "tasks", "calendar", "notes", "sounds", "analytics"):
            self.assertIn('id="sec-' + key + '"', HTML)
            self.assertIn("switchTab('sec-" + key + "'", HTML)
        self.assertIn('id="inpTaskDate"', HTML)
        self.assertIn('id="inpSearchNotes"', HTML)
        self.assertIn('id="soundsGridBox"', HTML)
        self.assertIn('id="calendarDayAgendaBox"', HTML)
        self.assertIn('id="kpiTotalMins"', HTML)
        self.assertIn('id="deskClockOverlay"', HTML)

    def test_focus_preset_tracks_selected_activity(self):
        self.assertIn('selectTimerMode(getDomainFocusMinutes()', HTML)
        self.assertIn('function getDomainFocusMinutes(', APP)
        self.assertIn('getDomainFocusMinutes(domain)', QUICK)

    def test_activity_controls_are_accessible_buttons(self):
        for domain in ("study", "sport", "read", "work"):
            self.assertRegex(
                HTML,
                r'<button type="button" class="domain-card dom-' + domain
                + r'[^"]*" id="domBtn-' + domain
                + r'" onclick="switchActivityDomain\(\'' + domain
                + r'\', this\)" aria-pressed="(?:true|false)">'
            )
        self.assertIn('.domain-card:focus-visible', HTML)

    def test_white_2100_reference_layout_is_real_ui_not_an_image(self):
        skin = ROOT / "android/app/src/main/assets/web/white_2100.css"
        self.assertTrue(skin.exists(), "The final white design stylesheet must ship in Android assets")
        css = skin.read_text(encoding="utf-8")
        self.assertIn('href="white_2100.css"', HTML)
        self.assertIn('id="focusHeroCard"', HTML)
        self.assertIn('id="homeQuick10"', HTML)
        self.assertIn('id="homeQuick25"', HTML)
        self.assertIn('id="homeQuick50"', HTML)
        self.assertIn('id="homeWeekStrip"', HTML)
        for domain, duration in (("study", "25"), ("sport", "30"), ("read", "20"), ("work", "50")):
            self.assertIn('id="domBtn-' + domain + '"', HTML)
            self.assertIn('class="domain-duration">' + duration + ':00', HTML)
        self.assertIn('.focus-hero-card .ring-container', css)
        self.assertIn('.home-quick-chip[aria-pressed="true"]', css)
        self.assertIn('@media (max-width: 360px)', css)
        self.assertIn('prefers-reduced-motion', css)

    def test_existing_utilities_and_screens_stay_interactive(self):
        for name in ('resetTimerNow()', 'skipTimerPhase()', 'changeTimerDelta(-5)',
                     'openCustomTimerModal()', 'startQuickTraining()', 'openBrainDumpModal()',
                     'openCloudBackupModal()', 'toggleDeskClock(true)', 'addWaterCup()'):
            self.assertIn(name, HTML)
        for feature in ("timer", "tasks", "calendar", "notes", "sounds", "analytics"):
            self.assertIn('id="sec-' + feature + '"', HTML)
        self.assertIn('function selectHomeQuickSession(', APP)
        self.assertIn('function goToHomeAgenda(', QUICK)
        self.assertIn('function renderHomeWeekStrip(', QUICK)

    def test_no_medical_meditation_or_language_course_added(self):
        self.assertNotIn('id="sec-meditation"', HTML)
        self.assertNotIn('id="sec-learn-languages"', HTML)

    def test_interval_workout_controls_and_no_destructive_reset(self):
        for control in ("qtSets", "qtWork", "qtRest", "qtSkipLast", "qtNewExercise",
                        "qtExerciseList", "qtStartButton", "qtProgressPanel"):
            self.assertIn('id="' + control + '"', HTML)
        for function in ("startQuickTraining", "skipQuickTrainingStep",
                         "advanceQuickTrainingStep", "cancelQuickTraining",
                         "validQuickSnapshot", "parseQuickTime"):
            self.assertIn("function " + function, QUICK)
        self.assertIn("training: quickTraining", APP)
        self.assertIn("quickTraining = validQuickSnapshot", APP)
        self.assertIn("renderTodayPlan()", APP)

    def test_engine_loaded_before_main_js(self):
        self.assertLess(HTML.index('src="quick_training.js"'),HTML.index('src="app.js"'))

    def test_timer_home_overrides_shared_page_chrome(self):
        # The generic later theme must not push the primary timer down.
        self.assertIn('body.timer-home:not(.deep-lockdown) .dynamic-hero-header', HTML)
        self.assertIn('body.timer-home:not(.deep-lockdown) .main-white-sheet', HTML)
        self.assertIn('padding:8px 14px 30px;', HTML)

    def test_white_visual_system_and_reduced_motion_kept(self):
        self.assertIn('background:var(--page-ambient', HTML)
        self.assertIn('prefers-reduced-motion', HTML)
        self.assertIn('body:not(.deep-lockdown) .main-white-sheet', HTML)
        self.assertIn('font-weight:600', HTML)


if __name__ == "__main__":
    unittest.main()
