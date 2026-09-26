"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  clearVocabularyCache,
  DEFAULT_PREFERENCES,
  applyVocabularyText,
  loadPreferences,
  loadVocabularyCache,
  parseVocabularyPayload,
  PREFERENCE_STORAGE_KEY,
  savePreferences,
  storeVocabularyCache,
} from "@/lib/settings-preferences.mjs";

type Preferences = typeof DEFAULT_PREFERENCES;
type LanguageMode = Preferences["languageMode"];
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const listeners = new Set<() => void>();
let currentPreferences: Preferences = DEFAULT_PREFERENCES;
let currentSerialized = "";

const SETTINGS_COPY = {
  en: {
    open: "Settings",
    heading: "Settings",
    close: "Close settings",
    language: "Language mode",
    english: "English",
    cantonese: "Cantonese",
    bilingual: "Bilingual",
    emojis: "Show emojis in dialogs and message boxes",
    vocabulary: "Local vocabulary file",
    choose: "Choose a JSON file from this device",
    replace: "Replace the local vocabulary file",
    loaded: "A valid local vocabulary file is active.",
    empty: "No local vocabulary file is active. Original wording is in use.",
    invalid: "The file is invalid. The current local settings were kept.",
    readError: "The file could not be read. The current local settings were kept.",
    persistenceUnavailable: "Browser storage is unavailable, so this selection may not persist after reload.",
    clear: "Clear or reset local vocabulary",
    cleared: "Local vocabulary was cleared. Original wording is in use.",
    note: "Settings and vocabulary stay in this browser. Files are not uploaded.",
  },
  yue: {
    open: "設定",
    heading: "設定",
    close: "關閉設定",
    language: "語言模式",
    english: "英文",
    cantonese: "廣東話",
    bilingual: "雙語",
    emojis: "喺對話框同訊息框顯示 emoji",
    vocabulary: "本地詞彙檔",
    choose: "喺呢部裝置揀一個 JSON 檔案",
    replace: "更換本地詞彙檔",
    loaded: "本地詞彙檔有效，依家用緊喇。",
    empty: "仲未有本地詞彙檔，暫時用返原本文字。",
    invalid: "檔案格式唔啱，現有本地設定保留不變。",
    readError: "讀取唔到檔案，現有本地設定保留不變。",
    persistenceUnavailable: "瀏覽器儲存空間用唔到，重新載入後未必保留到呢個設定。",
    clear: "清除或重設本地詞彙",
    cleared: "本地詞彙已清除，文字回復原樣。",
    note: "設定同詞彙只留喺呢個瀏覽器，檔案唔會上載。",
  },
} as const;

function copyFor(mode: LanguageMode, key: keyof (typeof SETTINGS_COPY)["en"]) {
  if (mode === "yue") return SETTINGS_COPY.yue[key];
  if (mode === "bi") return `${SETTINGS_COPY.en[key]} / ${SETTINGS_COPY.yue[key]}`;
  return SETTINGS_COPY.en[key];
}

function getStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function syncPreferences() {
  const storage = getStorage();
  const next = storage ? loadPreferences(storage) : DEFAULT_PREFERENCES;
  const serialized = JSON.stringify(next);
  if (serialized === currentSerialized) return;
  currentSerialized = serialized;
  currentPreferences = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const storageHandler = (event: StorageEvent) => {
    if (event.key === PREFERENCE_STORAGE_KEY || event.key === null) syncPreferences();
  };
  window.addEventListener("storage", storageHandler);
  queueMicrotask(syncPreferences);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", storageHandler);
  };
}

function getSnapshot() {
  return currentPreferences;
}

function getServerSnapshot() {
  return DEFAULT_PREFERENCES;
}

function updatePreferences(update: Partial<Preferences>) {
  const storage = getStorage();
  const next = { ...currentPreferences, ...update, schemaVersion: 1 as const };
  let persisted = false;
  if (storage) {
    try {
      savePreferences(storage, next);
      persisted = true;
    } catch {
      persisted = false;
    }
  }
  const serialized = JSON.stringify(next);
  currentSerialized = serialized;
  currentPreferences = next;
  for (const listener of listeners) listener();
  return persisted;
}

export function SiteSettings() {
  const preferences = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const openerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [hasVocabulary, setHasVocabulary] = useState(false);
  const [statusKey, setStatusKey] = useState<keyof (typeof SETTINGS_COPY)["en"]>("empty");
  const [vocabulary, setVocabulary] = useState<ReturnType<typeof parseVocabularyPayload> | null>(null);
  const mode = preferences.languageMode;
  const t = (key: keyof (typeof SETTINGS_COPY)["en"]) => applyVocabularyText(copyFor(mode, key), vocabulary);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const storage = getStorage();
      const saved = storage ? loadVocabularyCache(storage) : null;
      if (!active) return;
      setVocabulary(saved);
      setHasVocabulary(Boolean(saved));
      setStatusKey(saved ? "loaded" : "empty");
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = mode === "yue" ? "yue-Hant" : "en";
    document.documentElement.dataset.languageMode = mode;
  }, [mode]);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      panelRef.current?.focus();
      return;
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      openerRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    let parsed: ReturnType<typeof parseVocabularyPayload>;
    try {
      if (file.size > 1024 * 1024) throw new Error("oversize");
      const source = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      parsed = parseVocabularyPayload(source);
    } catch {
      setStatusKey("invalid");
      input.value = "";
      return;
    }
    try {
      const storage = getStorage();
      if (!storage) throw new Error("storage-unavailable");
      storeVocabularyCache(storage, parsed);
      setVocabulary(parsed);
      setHasVocabulary(true);
      setStatusKey("loaded");
    } catch {
      setStatusKey("persistenceUnavailable");
    } finally {
      input.value = "";
    }
  }

  function clearVocabulary() {
    try {
      const storage = getStorage();
      if (storage) clearVocabularyCache(storage);
      setVocabulary(null);
      setHasVocabulary(false);
      setStatusKey("cleared");
    } catch {
      setStatusKey("readError");
    }
  }

  return (
    <div className="site-settings">
      <button
        ref={openerRef}
        type="button"
        className="site-settings__opener"
        aria-expanded={open}
        aria-controls="site-settings-panel"
        onClick={() => setOpen((value) => !value)}
      >
        {t("open")}
      </button>
      {open && (
        <section
          id="site-settings-panel"
          ref={panelRef}
          className="site-settings__panel"
          aria-label={t("heading")}
          tabIndex={-1}
        >
          <div className="site-settings__heading">
            <h2>{t("heading")}</h2>
            <button type="button" className="site-settings__close" onClick={() => setOpen(false)}>
              {t("close")}
            </button>
          </div>
          <label className="site-settings__field">
            <span>{t("language")}</span>
            <select
              value={mode}
              onChange={(event) => {
                if (!updatePreferences({ languageMode: event.target.value as LanguageMode })) setStatusKey("persistenceUnavailable");
              }}
            >
              <option value="en">{t("english")}</option>
              <option value="yue">{t("cantonese")}</option>
              <option value="bi">{t("bilingual")}</option>
            </select>
          </label>
          <label className="site-settings__checkbox">
            <input
              type="checkbox"
              checked={preferences.showDialogEmojis}
              onChange={(event) => {
                if (!updatePreferences({ showDialogEmojis: event.target.checked })) setStatusKey("persistenceUnavailable");
              }}
            />
            <span>{t("emojis")}</span>
          </label>
          <div className="site-settings__field">
            <span>{t("vocabulary")}</span>
            <input
              ref={fileRef}
              className="site-settings__file"
              type="file"
              accept="application/json,.json"
              aria-label={t(hasVocabulary ? "replace" : "choose")}
              onChange={handleFileChange}
            />
          </div>
          <p className="site-settings__status" role="status" aria-live="polite">
            {t(statusKey)}
          </p>
          <button type="button" className="site-settings__reset" onClick={clearVocabulary} disabled={!hasVocabulary}>
            {t("clear")}
          </button>
          <p className="site-settings__privacy">{t("note")}</p>
        </section>
      )}
    </div>
  );
}
