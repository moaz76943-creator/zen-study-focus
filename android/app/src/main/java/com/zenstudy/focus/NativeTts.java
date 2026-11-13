package com.zenstudy.focus;

import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;

/**
 * Thin, honest wrapper around the device's installed Android TextToSpeech engine.
 *
 * - No network API is used by this class. Whether a voice needs a network is reported from the voice metadata
 *   (Voice.isNetworkConnectionRequired) and offline-only requests refuse such voices.
 * - Android exposes NO voice-gender API. Gender is reported "unknown" unless the engine puts an explicit
 *   "male" / "female" token into the voice feature set. Nothing is guessed from names or pitch.
 * - Android TTS has no pause/resume; capabilities() reports pause=false.
 * - Every method returns a JSON string {"ok":true,...} or {"ok":false,"code":...,"error":...} and never throws.
 * - Events (init/start/done/error/stopped) are delivered through EventSink as JSON strings.
 */
public final class NativeTts {

    public interface EventSink {
        void emit(String json);
    }

    private static final Pattern ID = Pattern.compile("^[A-Za-z0-9_\\-]{1,64}$");
    private static final Pattern LANG = Pattern.compile("^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$");
    private static final int HARD_MAX_TEXT = 3900;

    private final Context appContext;
    private final EventSink sink;
    private final Object lock = new Object();

    private TextToSpeech tts;
    private volatile boolean ready = false;
    private volatile boolean initializing = false;
    private String engineInUse = "";
    private String currentUtterance = null;
    private int generation = 0;

    public NativeTts(Context context, EventSink sink) {
        this.appContext = context.getApplicationContext();
        this.sink = sink;
    }

    // ---------- helpers ----------
    private static String fail(String code, String message) {
        try {
            return new JSONObject().put("ok", false).put("code", code).put("error", message).toString();
        } catch (JSONException e) {
            return "{\"ok\":false,\"code\":\"" + code + "\"}";
        }
    }

    private void emit(JSONObject o) {
        try {
            if (sink != null) sink.emit(o.toString().replace("\u2028", "\\u2028").replace("\u2029", "\\u2029"));
        } catch (RuntimeException ignored) {
            // a failing listener must never break speech state
        }
    }

    private static boolean validLanguage(String tag) {
        return tag != null && tag.length() <= 35 && LANG.matcher(tag).matches();
    }

    private static String genderOf(Voice v) {
        // Only trust explicit metadata. Android has no gender field.
        Set<String> f = v.getFeatures();
        if (f == null) return "unknown";
        for (String s : f) {
            if (s == null) continue;
            String t = s.toLowerCase(Locale.ROOT).replace("gender=", "").replace("gender:", "").replace("gender_", "").trim();
            if (t.equals("male")) return "male";
            if (t.equals("female")) return "female";
        }
        return "unknown";
    }

    private static boolean installed(Voice v) {
        Set<String> f = v.getFeatures();
        return f == null || !f.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED);
    }

    private JSONObject voiceJson(Voice v) throws JSONException {
        JSONArray feats = new JSONArray();
        Set<String> f = v.getFeatures();
        if (f != null) for (String s : new TreeSet<>(f)) feats.put(s);
        return new JSONObject()
                .put("id", v.getName())
                .put("language", v.getLocale().toLanguageTag())
                .put("quality", v.getQuality())
                .put("latency", v.getLatency())
                .put("networkRequired", v.isNetworkConnectionRequired())
                .put("installed", installed(v))
                .put("gender", genderOf(v))
                .put("features", feats);
    }

    // ---------- lifecycle ----------
    /** Starts (or restarts with another engine package) the TextToSpeech engine. Result arrives as an "init" event. */
    public String init(String enginePackage) {
        String engine = enginePackage == null ? "" : enginePackage.trim();
        if (engine.length() > 200) return fail("BAD_ENGINE", "Engine name too long");
        synchronized (lock) {
            if (initializing) return okStatus("initializing");
            if (ready && tts != null && engine.equals(engineInUse)) return okStatus("ready");
            shutdownLocked();
            initializing = true;
            final int gen = ++generation;
            engineInUse = engine;
            try {
                TextToSpeech.OnInitListener listener = status -> onInit(gen, status);
                tts = engine.isEmpty()
                        ? new TextToSpeech(appContext, listener)
                        : new TextToSpeech(appContext, listener, engine);
            } catch (RuntimeException e) {
                initializing = false;
                tts = null;
                return fail("INIT_FAILED", "Could not start text-to-speech");
            }
        }
        return okStatus("initializing");
    }

    private String okStatus(String status) {
        try {
            return new JSONObject().put("ok", true).put("status", status).toString();
        } catch (JSONException e) {
            return "{\"ok\":true}";
        }
    }

    private void onInit(int gen, int status) {
        JSONObject ev = new JSONObject();
        try {
            synchronized (lock) {
                if (gen != generation) return; // stale init from a replaced engine
                initializing = false;
                if (status != TextToSpeech.SUCCESS || tts == null) {
                    ready = false;
                    ev.put("event", "init").put("ok", false).put("code", "INIT_FAILED");
                } else {
                    ready = true;
                    tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                        @Override public void onStart(String id) { progress("start", id, null); }
                        @Override public void onDone(String id) { progress("done", id, null); }
                        @Override public void onError(String id) { progress("error", id, "SYNTHESIS_ERROR"); }
                        @Override public void onError(String id, int errorCode) { progress("error", id, "ERROR_" + errorCode); }
                        @Override public void onStop(String id, boolean interrupted) { progress("stopped", id, null); }
                    });
                    String def = "";
                    try { def = tts.getDefaultEngine(); } catch (RuntimeException ignored) { }
                    ev.put("event", "init").put("ok", true).put("engine", engineInUse.isEmpty() ? def : engineInUse);
                }
            }
            emit(ev);
        } catch (JSONException ignored) {
            // cannot happen for fixed keys
        }
    }

    private void progress(String event, String id, String code) {
        try {
            synchronized (lock) {
                if (id != null && id.equals(currentUtterance) && !"start".equals(event)) currentUtterance = null;
            }
            JSONObject ev = new JSONObject().put("event", event).put("utteranceId", id == null ? "" : id);
            if (code != null) ev.put("code", code);
            emit(ev);
        } catch (JSONException ignored) {
            // fixed keys
        }
    }

    public String stop() {
        synchronized (lock) {
            if (tts != null && ready) {
                try { tts.stop(); } catch (RuntimeException ignored) { }
            }
            currentUtterance = null;
        }
        return okStatus("stopped");
    }

    public String shutdown() {
        synchronized (lock) {
            shutdownLocked();
        }
        return okStatus("shutdown");
    }

    private void shutdownLocked() {
        generation++;
        ready = false;
        initializing = false;
        currentUtterance = null;
        if (tts != null) {
            try { tts.stop(); } catch (RuntimeException ignored) { }
            try { tts.shutdown(); } catch (RuntimeException ignored) { }
            tts = null;
        }
    }

    // ---------- discovery ----------
    public String capabilities() {
        try {
            return new JSONObject().put("ok", true)
                    .put("ready", ready)
                    .put("initializing", initializing)
                    .put("sdk", Build.VERSION.SDK_INT)
                    .put("pause", false)
                    .put("resume", false)
                    .put("genderApi", false)
                    .put("maxTextLength", maxText())
                    .toString();
        } catch (JSONException e) {
            return fail("JSON", "internal");
        }
    }

    private int maxText() {
        int m = HARD_MAX_TEXT;
        try { m = Math.min(m, TextToSpeech.getMaxSpeechInputLength()); } catch (RuntimeException ignored) { }
        return Math.max(100, m);
    }

    public String getEngines() {
        synchronized (lock) {
            if (tts == null) return fail("NOT_INITIALIZED", "Call init first");
            try {
                JSONArray arr = new JSONArray();
                String def = tts.getDefaultEngine();
                List<TextToSpeech.EngineInfo> engines = tts.getEngines();
                if (engines != null) {
                    for (TextToSpeech.EngineInfo e : engines) {
                        arr.put(new JSONObject().put("name", e.name).put("label", e.label == null ? e.name : e.label).put("default", e.name.equals(def)));
                    }
                }
                return new JSONObject().put("ok", true).put("engines", arr).put("current", engineInUse.isEmpty() ? def : engineInUse).toString();
            } catch (JSONException | RuntimeException e) {
                return fail("ENGINES_FAILED", "Could not read engines");
            }
        }
    }

    public String getLanguages() {
        synchronized (lock) {
            if (!ready || tts == null) return fail("NOT_READY", "Text-to-speech is not ready");
            try {
                JSONArray arr = new JSONArray();
                Set<Locale> locales = tts.getAvailableLanguages();
                List<String> tags = new ArrayList<>();
                if (locales != null) for (Locale l : locales) tags.add(l.toLanguageTag());
                java.util.Collections.sort(tags);
                for (String t : tags) arr.put(t);
                return new JSONObject().put("ok", true).put("languages", arr).toString();
            } catch (JSONException | RuntimeException e) {
                return fail("LANGUAGES_FAILED", "Could not read languages");
            }
        }
    }

    /** Availability of one language: available / country / variant / missing-data / not-supported. */
    public String languageStatus(String languageTag) {
        if (!validLanguage(languageTag)) return fail("BAD_LANGUAGE", "Invalid language tag");
        synchronized (lock) {
            if (!ready || tts == null) return fail("NOT_READY", "Text-to-speech is not ready");
            try {
                int r = tts.isLanguageAvailable(Locale.forLanguageTag(languageTag));
                String name;
                switch (r) {
                    case TextToSpeech.LANG_AVAILABLE: name = "language"; break;
                    case TextToSpeech.LANG_COUNTRY_AVAILABLE: name = "country"; break;
                    case TextToSpeech.LANG_COUNTRY_VAR_AVAILABLE: name = "variant"; break;
                    case TextToSpeech.LANG_MISSING_DATA: name = "missing-data"; break;
                    default: name = "not-supported"; break;
                }
                return new JSONObject().put("ok", true).put("language", languageTag).put("status", name)
                        .put("usable", r >= TextToSpeech.LANG_AVAILABLE).toString();
            } catch (JSONException | RuntimeException e) {
                return fail("LANGUAGE_STATUS_FAILED", "Could not check the language");
            }
        }
    }

    /** Voices for a language (matched on the language subtag; region is reported per voice). Empty tag = all voices. */
    public String getVoices(String languageTag) {
        String wanted = languageTag == null ? "" : languageTag.trim();
        if (!wanted.isEmpty() && !validLanguage(wanted)) return fail("BAD_LANGUAGE", "Invalid language tag");
        synchronized (lock) {
            if (!ready || tts == null) return fail("NOT_READY", "Text-to-speech is not ready");
            try {
                String lang = wanted.isEmpty() ? "" : Locale.forLanguageTag(wanted).getLanguage();
                JSONArray arr = new JSONArray();
                Set<Voice> voices = tts.getVoices();
                if (voices != null) {
                    List<Voice> sorted = new ArrayList<>(voices);
                    java.util.Collections.sort(sorted, (a, b) -> a.getName().compareTo(b.getName()));
                    for (Voice v : sorted) {
                        if (!lang.isEmpty() && !lang.equals(v.getLocale().getLanguage())) continue;
                        arr.put(voiceJson(v));
                    }
                }
                return new JSONObject().put("ok", true).put("voices", arr).toString();
            } catch (JSONException | RuntimeException e) {
                return fail("VOICES_FAILED", "Could not read voices");
            }
        }
    }

    // ---------- speech ----------
    /**
     * Speaks one utterance, replacing anything currently speaking (no overlap).
     * options: {utteranceId, language, voiceId, rate, pitch, offlineOnly}.
     */
    public String speak(String text, String optionsJson) {
        if (text == null || text.trim().isEmpty()) return fail("EMPTY_TEXT", "Nothing to speak");
        JSONObject o;
        try {
            o = new JSONObject(optionsJson == null || optionsJson.isEmpty() ? "{}" : optionsJson);
        } catch (JSONException e) {
            return fail("BAD_OPTIONS", "Options must be JSON");
        }
        String id = o.optString("utteranceId", "");
        if (!ID.matcher(id).matches()) return fail("BAD_ID", "Invalid utterance id");
        String language = o.optString("language", "");
        if (!language.isEmpty() && !validLanguage(language)) return fail("BAD_LANGUAGE", "Invalid language tag");
        String voiceId = o.optString("voiceId", "");
        if (voiceId.length() > 200) return fail("BAD_VOICE", "Invalid voice");
        double rate = o.optDouble("rate", 1.0);
        double pitch = o.optDouble("pitch", 1.0);
        if (Double.isNaN(rate) || rate < 0.5 || rate > 2.0) return fail("BAD_RATE", "Rate must be between 0.5 and 2.0");
        if (Double.isNaN(pitch) || pitch < 0.5 || pitch > 2.0) return fail("BAD_PITCH", "Pitch must be between 0.5 and 2.0");
        boolean offlineOnly = o.optBoolean("offlineOnly", false);

        synchronized (lock) {
            if (!ready || tts == null) return fail("NOT_READY", "Text-to-speech is not ready");
            if (text.length() > maxText()) return fail("TEXT_TOO_LONG", "Text is too long to speak");
            try {
                if (!voiceId.isEmpty()) {
                    Voice chosen = null;
                    Set<Voice> all = tts.getVoices();
                    if (all != null) for (Voice v : all) if (voiceId.equals(v.getName())) { chosen = v; break; }
                    if (chosen == null) return fail("VOICE_UNAVAILABLE", "The selected voice is not available");
                    if (!installed(chosen)) return fail("VOICE_NOT_INSTALLED", "The selected voice data is not installed");
                    if (offlineOnly && chosen.isNetworkConnectionRequired()) return fail("VOICE_REQUIRES_NETWORK", "This voice needs a network connection");
                    if (!language.isEmpty() && !Locale.forLanguageTag(language).getLanguage().equals(chosen.getLocale().getLanguage())) {
                        return fail("VOICE_LANGUAGE_MISMATCH", "The selected voice speaks another language");
                    }
                    if (tts.setVoice(chosen) != TextToSpeech.SUCCESS) return fail("VOICE_UNAVAILABLE", "Could not select the voice");
                } else if (!language.isEmpty()) {
                    int r = tts.setLanguage(Locale.forLanguageTag(language));
                    if (r < TextToSpeech.LANG_AVAILABLE) {
                        return fail(r == TextToSpeech.LANG_MISSING_DATA ? "LANGUAGE_DATA_MISSING" : "LANGUAGE_UNAVAILABLE",
                                "This language is not available on this device");
                    }
                    Voice cur = tts.getVoice();
                    if (offlineOnly && cur != null && cur.isNetworkConnectionRequired()) {
                        return fail("VOICE_REQUIRES_NETWORK", "The default voice for this language needs a network connection");
                    }
                }
                tts.setSpeechRate((float) rate);
                tts.setPitch((float) pitch);
                Bundle params = new Bundle();
                currentUtterance = id;
                int res = tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, id);
                if (res != TextToSpeech.SUCCESS) {
                    currentUtterance = null;
                    return fail("SPEAK_FAILED", "The engine refused the request");
                }
                return new JSONObject().put("ok", true).put("utteranceId", id).put("rate", rate).put("pitch", pitch).toString();
            } catch (JSONException | RuntimeException e) {
                currentUtterance = null;
                return fail("SPEAK_FAILED", "Speech failed");
            }
        }
    }
}
