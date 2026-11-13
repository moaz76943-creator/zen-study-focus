# Storage keys

Every localStorage key the app writes by literal name. A test fails when a new key is not listed here.
Protected v21 packets (`{payload,sig,ts}` + `_mirror`) must never change shape.

| Key | Notes |
|---|---|
| `__p__` | app state |
| `df_20_20_20_relief_v1` | app state |
| `df_active_deck_v1` | app state |
| `df_active_exam_v1` | app state |
| `df_active_soundscape_v1` | app state |
| `df_alarm_resilience_v1` | app state |
| `df_android_widget_payload` | app state |
| `df_audio_gc_v1` | app state |
| `df_audio_halt_v1` | app state |
| `df_auto_archive_mastered_v1` | app state |
| `df_binaural_gamma_active_v1` | app state |
| `df_break_pacing_v1` | app state |
| `df_burnout_shield_v1` | app state |
| `df_card_intervals_v1` | app state |
| `df_cards_v1` | app state |
| `df_daily_progress_v1` | app state |
| `df_data_schema_v1` | app state |
| `df_decks` | app state |
| `df_dnd_focus_reminder_v1` | app state |
| `df_eink_paper_theme_enabled` | app state |
| `df_end_tone` | app state |
| `df_flip_to_mute_enabled_v1` | app state |
| `df_focus_energy_v1` | app state |
| `df_focus_momentum_v1` | app state |
| `df_focus_today_minutes_v1` | app state |
| `df_halfway_chime_enabled_v1` | app state |
| `df_hourly_focus_distribution_v1` | app state |
| `df_last_fsrs45_v1` | app state |
| `df_last_quiz_summary_v1` | app state |
| `df_last_safe_card_v1` | app state |
| `df_last_sovereign_backup_v1` | app state |
| `df_last_svg_audit_v1` | app state |
| `df_live_session_snapshot` | app state |
| `df_migrated_to_idb` | app state |
| `df_monotonic_session_v1` | app state |
| `df_multi_studio_audit_report_v1` | app state |
| `df_notes_v1` | app state |
| `df_oled_true_black_v1` | app state |
| `df_personal_records_v1` | app state |
| `df_release_manifest_v1` | app state |
| `df_retention_velocity_v1` | app state |
| `df_session_history_v1` | app state |
| `df_sessions` | app state |
| `df_sleep_timer_target_v1` | app state |
| `df_spatial_preset_` | app state |
| `df_spelling_mode_enabled_v1` | app state |
| `df_stats` | app state |
| `df_study_tempo_v1` | app state |
| `df_syllabus_schedule_v1` | app state |
| `df_system_health_report_v1` | app state |
| `df_tasks_v1` | app state |
| `df_timer_heartbeat_pulse` | app state |
| `df_trizone_draft_` | app state |
| `df_true_streak_v1` | app state |
| `df_vocab_active_tier_filter_v1` | app state |
| `df_vocab_bank` | app state |
| `df_vocab_bank_v1` | app state |
| `df_vocab_daily_goal_v1` | app state |
| `df_vocab_foreign_lang` | app state |
| `df_vocab_goal_celebrated_v1` | app state |
| `df_vocab_pair` | app state |
| `df_vocab_study_history_v1` | app state |
| `df_vocab_today_reviewed_v1` | app state |
| `df_volume_ambient_v1` | app state |
| `df_volume_tts_v1` | app state |
| `df_warm_sepia_theme_enabled` | app state |
| `df_whiteboard_redo_v1` | app state |
| `df_wind_chimes_enabled_v1` | app state |
| `zen_fortress_cfg_v21` | protected v21 packet (+ `_mirror`) |
| `zen_fortress_notes_v21` | protected v21 packet (+ `_mirror`) |
| `zen_fortress_tasks_v21` | protected v21 packet (+ `_mirror`) |
| `zen_locked_task_id` | app state |

Dynamic keys: `df_quarantine_<key>_<0-2>` and `_last` (damaged raw copies, bounded), plus keys written via `dfSafeSetStorage`.

## Flashcards (added)
- `df_fc_meta_v1`, `df_fc_cards_v1_<n>`, `df_fc_quarantine_*` — see docs/FLASHCARDS.md. Legacy flashcard keys are read-only inputs to a one-time migration.
