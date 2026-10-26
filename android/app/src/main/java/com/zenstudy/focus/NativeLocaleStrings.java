package com.zenstudy.focus;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import java.util.Locale;
import java.util.regex.Pattern;

/** Native-only language preference, isolated from all v21 WebView storage. */
public final class NativeLocaleStrings {
    private static final String PREFS = "zen_native_locale_i18n_v1";
    private static final String LANGUAGE_TAG = "languageTag";
    private static final Pattern SUPPORTED_TAG =
            Pattern.compile("^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$");

    private NativeLocaleStrings() {}

    /**
     * Optional WebView call. A valid language tag without native translations
     * falls back to res/values/strings.xml, never to a missing-resource ID.
     * Hebrew (he/iw) is intentionally excluded, including regional tags.
     */
    public static boolean select(Context context, String languageTag) {
        if (languageTag == null) return false;
        String candidate = languageTag.trim();
        if (!SUPPORTED_TAG.matcher(candidate).matches()) return false;
        Locale selected = Locale.forLanguageTag(candidate);
        String code = selected.getLanguage().toLowerCase(Locale.ROOT);
        if ("he".equals(code) || "iw".equals(code) || code.isEmpty()) return false;
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        p.edit().putString(LANGUAGE_TAG, selected.toLanguageTag()).apply();
        return true;
    }

    private static Context localized(Context context) {
        String tag = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(LANGUAGE_TAG, null);
        if (tag == null || tag.isEmpty()) return context;
        Locale chosen = Locale.forLanguageTag(tag);
        Configuration copy = new Configuration(context.getResources().getConfiguration());
        copy.setLocale(chosen);
        return context.createConfigurationContext(copy);
    }

    public static String get(Context context, int resourceId) {
        return localized(context).getString(resourceId);
    }

    public static String format(Context context, int resourceId, Object... args) {
        return localized(context).getString(resourceId, args);
    }
}
