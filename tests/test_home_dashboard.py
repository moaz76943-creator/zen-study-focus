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
        training = HTML.index('id="quickTrainingCard"', timer_start)
        metrics = HTML.index('class="pure-white-card quick-orbs-card"', timer_start)
        self.assertLess(timer_start, focus)
        self.assertLess(focus, domains)
        self.assertLess(domains, training)
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

    def test_white_visual_system_and_reduced_motion_kept(self):
        self.assertIn('background:var(--page-ambient', HTML)
        self.assertIn('prefers-reduced-motion', HTML)
        self.assertIn('body:not(.deep-lockdown) .main-white-sheet', HTML)
        self.assertIn('font-weight:600', HTML)


if __name__ == "__main__":
    unittest.main()
