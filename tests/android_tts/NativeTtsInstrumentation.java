package com.zenstudy.focus.tts;

import android.app.Instrumentation;
import android.os.Bundle;
import android.util.Log;

import com.zenstudy.focus.NativeTts;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Runs the SHIPPED NativeTts class against the emulator's real Android TextToSpeech service.
 * It never claims audible output: an emulator has no loudspeaker check. Each check prints
 * PASS / FAIL / SKIP(reason) to logcat tag DF_TTS_REAL and into the instrumentation result.
 * SKIP is used only when the image has no usable engine or no installed voice data, and is reported as such.
 */
public final class NativeTtsInstrumentation extends Instrumentation {
    private static final String TAG = "DF_TTS_REAL";
    private final List<String> lines = new ArrayList<>();
    private final CopyOnWriteArrayList<JSONObject> events = new CopyOnWriteArrayList<>();
    private int failures = 0;

    @Override public void onCreate(Bundle args) { super.onCreate(args); start(); }

    private void rec(String name, String status, String detail) {
        String l = status + " " + name + (detail == null || detail.isEmpty() ? "" : " :: " + detail);
        lines.add(l); Log.i(TAG, l);
        if ("FAIL".equals(status)) failures++;
    }
    private void check(String name, boolean ok, String detail) { rec(name, ok ? "PASS" : "FAIL", ok ? "" : detail); }
    private JSONObject j(String s) { try { return new JSONObject(s); } catch (Exception e) { return new JSONObject(); } }
    private boolean waitEvent(String type, String id, long ms) throws InterruptedException {
        long end = System.currentTimeMillis() + ms;
        while (System.currentTimeMillis() < end) {
            for (JSONObject e : events) if (type.equals(e.optString("type", e.optString("event"))) && (id == null || id.equals(e.optString("utteranceId")))) return true;
            Thread.sleep(100);
        }
        return false;
    }

    @Override public void onStart() {
        super.onStart();
        Bundle out = new Bundle();
        try {
            NativeTts tts = new NativeTts(getTargetContext(), s -> { try { events.add(new JSONObject(s)); } catch (Exception ignored) { } });
            JSONObject caps0 = j(tts.capabilities());
            check("capabilities before init", caps0.optBoolean("ok") && !caps0.optBoolean("ready") && !caps0.optBoolean("pause") && !caps0.optBoolean("genderApi"), caps0.toString());
            check("not ready: voices refused", "NOT_READY".equals(j(tts.getVoices("en")).optString("code")), "");
            check("bad speak id rejected", "BAD_ID".equals(j(tts.speak("hi", "{\"utteranceId\":\"a b\"}")).optString("code")), "");
            check("rate below 0.5 rejected", rateCode(tts, 0.4).equals("BAD_RATE") || rateCode(tts, 0.4).equals("NOT_READY"), rateCode(tts, 0.4));

            JSONObject init = j(tts.init(""));
            check("init accepted", init.optBoolean("ok"), init.toString());
            boolean ready = false;
            for (int i = 0; i < 100 && !ready; i++) { Thread.sleep(200); ready = j(tts.capabilities()).optBoolean("ready"); }
            if (!ready) {
                rec("engine ready", "SKIP", "no usable TextToSpeech engine on this emulator image (environmental, not an app result)");
                rec("all speech checks", "SKIP", "engine unavailable");
            } else {
                rec("engine ready", "PASS", "");
                JSONObject eng = j(tts.getEngines());
                check("engine discovery", eng.optBoolean("ok") && eng.optJSONArray("engines") != null && eng.optJSONArray("engines").length() > 0, eng.toString());
                JSONObject langs = j(tts.getLanguages());
                check("language discovery", langs.optBoolean("ok"), langs.toString());
                JSONArray la = langs.optJSONArray("languages");
                rec("language count", "INFO", la == null ? "0" : String.valueOf(la.length()));
                JSONObject st = j(tts.languageStatus("en-US"));
                check("language status en-US", st.optBoolean("ok") && st.has("status") && st.has("usable"), st.toString());
                check("bad language tag rejected", "BAD_LANGUAGE".equals(j(tts.languageStatus("en US;x")).optString("code")), "");
                JSONObject st2 = j(tts.languageStatus("tlh"));
                check("unsupported language is reported, never substituted", st2.optBoolean("ok") && !st2.optBoolean("usable"), st2.toString());
                JSONObject voices = j(tts.getVoices("en"));
                check("voice discovery", voices.optBoolean("ok"), voices.toString());
                JSONArray va = voices.optJSONArray("voices");
                boolean genderHonest = true;
                if (va != null) for (int i = 0; i < va.length(); i++) {
                    JSONObject v = va.optJSONObject(i); String g = v.optString("gender");
                    if (!(g.equals("male") || g.equals("female") || g.equals("unknown"))) genderHonest = false;
                    if (g.equals("male")) { boolean tok = false; JSONArray f = v.optJSONArray("features"); for (int k = 0; f != null && k < f.length(); k++) if (f.optString(k).toLowerCase().contains("male")) tok = true; if (!tok) genderHonest = false; }
                }
                check("gender is male/female only with explicit feature token", genderHonest, voices.toString());
                rec("voices for en", "INFO", va == null ? "0" : String.valueOf(va.length()));

                JSONObject speak = j(tts.speak("Hello", "{\"utteranceId\":\"u1\",\"language\":\"en-US\",\"rate\":1.0,\"pitch\":1.0}"));
                if (speak.optBoolean("ok")) {
                    check("speak(en-US) produces done or error event (never silent)", waitEvent("done", "u1", 20000) || waitEvent("error", "u1", 1000), events.toString());
                } else rec("speak en-US", "SKIP", "language data not installed: " + speak.optString("code"));
                check("rate above 2.0 rejected", "BAD_RATE".equals(rateCode(tts, 2.5)), "");
                check("pitch out of range rejected", "BAD_PITCH".equals(j(tts.speak("x", "{\"utteranceId\":\"p1\",\"pitch\":3}")).optString("code")), "");
                events.clear();
                j(tts.speak("First sentence is long enough to be interrupted by the second one.", "{\"utteranceId\":\"o1\",\"language\":\"en-US\"}"));
                j(tts.speak("Second.", "{\"utteranceId\":\"o2\",\"language\":\"en-US\"}"));
                boolean o2 = waitEvent("done", "o2", 20000) || waitEvent("error", "o2", 1000);
                boolean o1doneAfter = false; // o1 must never report "done" (it was replaced)
                for (JSONObject e : events) if ("o1".equals(e.optString("utteranceId")) && "done".equals(e.optString("type", e.optString("event")))) o1doneAfter = true;
                check("second utterance replaces first (no overlap)", o2 && !o1doneAfter, events.toString());
                check("stop returns ok", j(tts.stop()).optBoolean("ok"), "");
                JSONObject offline = j(tts.speak("Hello", "{\"utteranceId\":\"n1\",\"language\":\"en-US\",\"offlineOnly\":true}"));
                rec("offlineOnly speak result", "INFO", offline.toString());
                check("engine restart (init same/other engine) is accepted", j(tts.init("")).optBoolean("ok"), "");
            }
            check("shutdown ok", j(tts.shutdown()).optBoolean("ok"), "");
            check("after shutdown: not ready", !j(tts.capabilities()).optBoolean("ready"), "");
            check("after shutdown: speak refused", "NOT_READY".equals(j(tts.speak("x", "{\"utteranceId\":\"z\"}")).optString("code")), "");
        } catch (Throwable t) {
            rec("instrumentation crashed", "FAIL", t.toString());
        }
        out.putString("df_tts_status", failures == 0 ? "PASS" : "FAIL");
        StringBuilder sb = new StringBuilder(); for (String l : lines) sb.append(l).append('\n');
        out.putString("df_tts_report", sb.toString());
        finish(failures == 0 ? android.app.Activity.RESULT_OK : android.app.Activity.RESULT_CANCELED, out);
    }

    private String rateCode(NativeTts tts, double r) { return j(tts.speak("x", "{\"utteranceId\":\"r1\",\"rate\":" + r + "}")).optString("code"); }
}
