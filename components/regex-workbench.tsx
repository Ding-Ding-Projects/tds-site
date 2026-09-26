"use client";

import { useEffect, useRef, useState } from "react";
import { applyVocabularyText } from "@/lib/settings-preferences.mjs";

type LanguageMode = "en" | "yue" | "bi";
type Vocabulary = { schemaVersion: 1; entries: Record<string, string> } | null;
type WorkbenchKey = keyof typeof COPY.en;
type SearchItem = { id: string; text: string };
type Match = { text: string; index: number; length: number; groups: (string | undefined)[]; namedGroups: Record<string, string> | null; indices: [number, number][] | null; zeroWidth: boolean };
type Evaluation = {
  pattern: string;
  flags: string;
  matches: Match[];
  caseResults: { expected: boolean; matched: boolean; text: string }[];
  searchMatches: string[];
  replacementPreview: string;
  tokens: { text: string; kind: string; start: number; end: number }[];
  riskNotes: string[];
  elapsedMs: number;
  engine: string;
  capabilities: { flags: { flag: string; supported: boolean }[]; setOperationsSupported: boolean; setOperationsUsedWithoutVFlag: boolean; unsupported: string[]; trace: string };
};

const COPY = {
  en: {
    heading: "Regex workbench",
    pattern: "Pattern and Settings search query",
    raw: "Raw regex mode",
    rawHelp: "Off means plain-text search. Turn it on to use the pattern and flags below.",
    flags: "Engine flags",
    global: "Global",
    ignoreCase: "Ignore case",
    multiline: "Multiline anchors",
    dotAll: "Dot matches newlines",
    unicode: "Unicode mode",
    unicodeSets: "Unicode sets mode",
    indices: "Capture indices",
    sticky: "Sticky match",
    literal: "Escape literal text",
    literalPlaceholder: "Enter text to escape",
    escape: "Escape and use as pattern",
    codePoint: "Unicode code point",
    codePointPlaceholder: "For example, 1F600",
    appendPoint: "Append code point",
    guided: "Guided construction",
    characterClass: "Character class",
    intersection: "Class intersection",
    subtraction: "Class subtraction",
    anchors: "Anchors and boundaries",
    capturing: "Capture group",
    numbered: "Numbered backreference",
    named: "Named group",
    nonCapturing: "Non-capturing group",
    alternation: "Alternation",
    greedy: "Greedy quantifier",
    lazy: "Lazy quantifier",
    lookAhead: "Positive lookahead",
    negativeLookAhead: "Negative lookahead",
    lookBehind: "Positive lookbehind",
    negativeLookBehind: "Negative lookbehind",
    replacement: "Replacement template",
    replacementPlaceholder: "Use $&, $1, $<name>, $$, $` or $'",
    sample: "Sample text",
    samplePlaceholder: "Enter a bounded sample to analyze locally",
    positiveCases: "Cases expected to match",
    negativeCases: "Cases expected not to match",
    onePerLine: "One case per line, up to 12 cases total",
    copyPattern: "Copy pattern",
    export: "Export pattern JSON",
    import: "Import pattern JSON from text",
    importPlaceholder: "Paste a JSON object with pattern, flags, and replacement",
    loadImport: "Load pattern",
    saveSnippet: "Save snippet in this session",
    snippets: "Saved session snippets",
    noSnippets: "No snippets saved in this session.",
    engine: "Regular-expression engine",
    capabilities: "Engine capabilities",
    supported: "Supported flags",
    unsupported: "Unsupported constructs",
    trace: "Trace and safety",
    tokens: "Token-by-token explanation",
    matches: "Matches and captures",
    noMatches: "No matches in this sample.",
    moreMatches: "Only the first 100 matches are shown.",
    previous: "Previous match",
    next: "Next match",
    matchPosition: "Match {current} of {total}",
    zeroWidth: "Zero-width match. Navigation advances without changing the input.",
    cases: "Expected-case results",
    pass: "As expected",
    fail: "Unexpected result",
    replacementPreview: "Replacement preview",
    risk: "Backtracking warnings",
    noRisk: "No obvious nested-repetition pattern was detected. This is a heuristic, not a proof of safety.",
    profile: "Bounded timing estimate",
    idle: "Enter a pattern to inspect it.",
    timeout: "Evaluation exceeded the time limit and was stopped.",
    tooLarge: "Pattern or sample exceeds its configured size limit.",
    imported: "Pattern loaded from the pasted JSON.",
    invalidImport: "That JSON object is invalid. The current pattern is unchanged.",
    copied: "Pattern copied to the clipboard.",
    copyFailed: "Clipboard access is unavailable. Select and copy the pattern manually.",
    flagConflict: "Unicode and Unicode sets flags cannot be used together.",
    settingsResults: "Settings matches",
    unsupportedSetOps: "This pattern uses Unicode set operations but the selected engine mode does not enable them.",
    saved: "Pattern saved for this session.",
  },
  yue: {
    heading: "Regex 工作台",
    pattern: "Pattern 同設定搜尋字串",
    raw: "使用 Regex 模式",
    rawHelp: "關閉時用純文字搜尋。開啟後先會用下面嘅 pattern 同 flags。",
    flags: "引擎 flags",
    global: "全部匹配",
    ignoreCase: "唔分大小寫",
    multiline: "多行錨點",
    dotAll: "點號包含換行",
    unicode: "Unicode 模式",
    unicodeSets: "Unicode 集合模式",
    indices: "捕捉位置",
    sticky: "黐住位置匹配",
    literal: "跳脫普通文字",
    literalPlaceholder: "輸入要跳脫嘅文字",
    escape: "跳脫並作為 pattern",
    codePoint: "Unicode 碼點",
    codePointPlaceholder: "例如 1F600",
    appendPoint: "加入碼點",
    guided: "引導式組合",
    characterClass: "字元集合",
    intersection: "集合交集",
    subtraction: "集合減法",
    anchors: "錨點同邊界",
    capturing: "捕捉群組",
    numbered: "編號反向參照",
    named: "命名群組",
    nonCapturing: "非捕捉群組",
    alternation: "二選一",
    greedy: "貪婪量詞",
    lazy: "懶惰量詞",
    lookAhead: "正向前視",
    negativeLookAhead: "負向前視",
    lookBehind: "正向後視",
    negativeLookBehind: "負向後視",
    replacement: "取代格式",
    replacementPlaceholder: "可用 $&, $1, $<name>, $$, $` 或 $'",
    sample: "測試文字",
    samplePlaceholder: "輸入本機分析用嘅有限文字",
    positiveCases: "預期會匹配嘅案例",
    negativeCases: "預期唔會匹配嘅案例",
    onePerLine: "每行一個案例，最多 12 個",
    copyPattern: "複製 pattern",
    export: "匯出 pattern JSON",
    import: "由文字匯入 pattern JSON",
    importPlaceholder: "貼上包含 pattern、flags 同 replacement 嘅 JSON",
    loadImport: "載入 pattern",
    saveSnippet: "儲存本次工作片段",
    snippets: "本次工作已儲存片段",
    noSnippets: "今次未有儲存片段。",
    engine: "正規表達式引擎",
    capabilities: "引擎支援情況",
    supported: "支援嘅 flags",
    unsupported: "唔支援嘅結構",
    trace: "追蹤同安全",
    tokens: "逐個 token 解釋",
    matches: "匹配同捕捉內容",
    noMatches: "呢段測試文字冇匹配。",
    moreMatches: "只顯示頭 100 個匹配。",
    previous: "上一個匹配",
    next: "下一個匹配",
    matchPosition: "第 {current} 個，共 {total} 個",
    zeroWidth: "零寬度匹配。移動時只會前進，唔會改動輸入文字。",
    cases: "預期案例結果",
    pass: "結果符合預期",
    fail: "結果同預期唔同",
    replacementPreview: "取代預覽",
    risk: "回溯風險提示",
    noRisk: "未見明顯巢狀重複模式。呢個只係估算，唔係安全保證。",
    profile: "有限次數嘅時間估算",
    idle: "輸入 pattern 開始檢查。",
    timeout: "分析超過時間限制，已停止。",
    tooLarge: "Pattern 或測試文字超出大小限制。",
    imported: "已由 JSON 文字載入 pattern。",
    invalidImport: "JSON 物件格式唔啱，現有 pattern 保持不變。",
    copied: "Pattern 已複製到剪貼簿。",
    copyFailed: "剪貼簿用唔到，可以手動選取同複製 pattern。",
    flagConflict: "Unicode 同 Unicode 集合 flags 唔可以一齊用。",
    settingsResults: "設定項目匹配結果",
    unsupportedSetOps: "呢個 pattern 用咗 Unicode 集合運算，但所選引擎模式未有啟用。",
    saved: "Pattern 已儲存喺今次工作階段。",
  },
} as const;

const FLAG_NAMES = ["d", "g", "i", "m", "s", "u", "v", "y"] as const;
const GUIDED_TOKENS = [
  { key: "characterClass", snippet: "[]", cursor: 1 },
  { key: "anchors", snippet: "^\\b" },
  { key: "capturing", snippet: "()", cursor: 1 },
  { key: "numbered", snippet: "\\1" },
  { key: "named", snippet: "(?<name>)", cursor: 8 },
  { key: "nonCapturing", snippet: "(?:)" , cursor: 3 },
  { key: "alternation", snippet: "(?:|)", cursor: 3 },
  { key: "greedy", snippet: "+" },
  { key: "lazy", snippet: "+?" },
  { key: "lookAhead", snippet: "(?=)" , cursor: 3 },
  { key: "negativeLookAhead", snippet: "(?! )", cursor: 3 },
  { key: "lookBehind", snippet: "(?<=)" , cursor: 4 },
  { key: "negativeLookBehind", snippet: "(?<! )", cursor: 4 },
] as const;

function localText(key: WorkbenchKey, mode: LanguageMode, vocabulary: Vocabulary) {
  const english = COPY.en[key];
  const cantonese = COPY.yue[key];
  const text = mode === "yue" ? cantonese : mode === "bi" ? `${english} / ${cantonese}` : english;
  return applyVocabularyText(text, vocabulary);
}

function toggleFlag(flags: string, flag: string) {
  if (flags.includes(flag)) return flags.replace(flag, "");
  if (flag === "u" || flag === "v") return `${flags.replace(/[uv]/gu, "")}${flag}`;
  return `${flags}${flag}`;
}

export function RegexWorkbench({
  open, languageMode, vocabulary, pattern, onPatternChange, regexEnabled, onRegexEnabledChange,
  flags, onFlagsChange, searchItems, onEvaluation, onInsertPattern,
}: {
  open: boolean;
  languageMode: LanguageMode;
  vocabulary: Vocabulary;
  pattern: string;
  onPatternChange: (pattern: string) => void;
  regexEnabled: boolean;
  onRegexEnabledChange: (enabled: boolean) => void;
  flags: string;
  onFlagsChange: (flags: string) => void;
  searchItems: SearchItem[];
  onEvaluation: (result: Evaluation | null, error: string | null) => void;
  onInsertPattern: (snippet: string, cursorOffset?: number) => void;
}) {
  const [literal, setLiteral] = useState("");
  const [codePoint, setCodePoint] = useState("");
  const [sample, setSample] = useState("ABC-123\nXYZ-007");
  const [replacement, setReplacement] = useState("$&");
  const [positiveText, setPositiveText] = useState("ABC-123");
  const [negativeText, setNegativeText] = useState("INVALID");
  const [importText, setImportText] = useState("");
  const [snippets, setSnippets] = useState<{ pattern: string; flags: string }[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<WorkbenchKey | null>(null);
  const [selectedMatch, setSelectedMatch] = useState(0);
  const requestId = useRef(0);
  const t = (key: WorkbenchKey) => localText(key, languageMode, vocabulary);

  useEffect(() => {
    if (!open && !regexEnabled) {
      onEvaluation(null, null);
      setEvaluation(null);
      setError(null);
      return;
    }
    const currentRequest = ++requestId.current;
    if (!pattern && regexEnabled) {
      onEvaluation(null, null);
      setEvaluation(null);
      setError(null);
      return;
    }
    const positiveCases = positiveText.split(/\r?\n/u).filter(Boolean).slice(0, 12);
    const negativeCases = negativeText.split(/\r?\n/u).filter(Boolean).slice(0, 12);
    let worker: Worker | undefined;
    let timeout = 0;
    const timer = window.setTimeout(() => {
      try {
        worker = new Worker("/regex-worker.js");
      } catch {
        setError("The local regex worker could not start.");
        onEvaluation(null, "The local regex worker could not start.");
        return;
      }
      timeout = window.setTimeout(() => {
        worker?.terminate();
        worker = undefined;
          setEvaluation(null);
          setError(t("timeout"));
          onEvaluation(null, t("timeout"));
        }
      }, 120);
      worker.onmessage = (event: MessageEvent<{ requestId: number; result?: Evaluation; error?: string }>) => {
        if (event.data.requestId !== currentRequest || requestId.current !== currentRequest) return;
        window.clearTimeout(timeout);
        worker?.terminate();
        worker = undefined;
        if (event.data.error) {
          setEvaluation(null);
          setError(event.data.error);
          onEvaluation(null, event.data.error);
          return;
        }
        const result = event.data.result ?? null;
        setEvaluation(result);
        setError(null);
        setSelectedMatch(0);
        onEvaluation(result, null);
      };
      worker.onerror = () => {
        window.clearTimeout(timeout);
        worker?.terminate();
        worker = undefined;
        if (requestId.current === currentRequest) {
          setEvaluation(null);
          setError("The local regex worker failed.");
          onEvaluation(null, "The local regex worker failed.");
        }
      };
      worker.postMessage({
        requestId: currentRequest,
        payload: { pattern, flags, sample, replacement, positiveCases, negativeCases, searchItems: regexEnabled ? searchItems : [] },
      });
    }, 120);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(timeout);
      worker?.terminate();
      worker = undefined;
      requestId.current += 1;
    };
  }, [open, regexEnabled, pattern, flags, sample, replacement, positiveText, negativeText, searchItems, onEvaluation]);

  function appendLiteral() {
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    onPatternChange(escaped.slice(0, 512));
  }

  function appendCodePoint() {
    const value = codePoint.trim().replace(/^U\+/iu, "");
    if (!/^[0-9A-Fa-f]{1,6}$/u.test(value) || Number.parseInt(value, 16) > 0x10ffff) {
      setError(t("tooLarge"));
      return;
    }
    onInsertPattern(`\\u{${value.toUpperCase()}}`);
    if (!flags.includes("u") && !flags.includes("v")) onFlagsChange(toggleFlag(flags, "u"));
  }

  function importPattern() {
    try {
      if (new TextEncoder().encode(importText).byteLength > 16 * 1024) throw new Error("oversize");
      const parsed = JSON.parse(importText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).some((key) => !["pattern", "flags", "replacement"].includes(key))) throw new Error("shape");
      if (typeof parsed.pattern !== "string" || parsed.pattern.length > 512 || typeof parsed.flags !== "string" || typeof parsed.replacement !== "string" || parsed.replacement.length > 4096) throw new Error("value");
      onPatternChange(parsed.pattern);
      onFlagsChange([...new Set(parsed.flags)].filter((flag: string) => FLAG_NAMES.includes(flag as (typeof FLAG_NAMES)[number])).join(""));
      setReplacement(parsed.replacement);
      setRegexEnabled(true);
      setNotice("imported");
      setError(null);
    } catch {
      setNotice("invalidImport");
    }
  }

  async function copyPattern() {
    try {
      await navigator.clipboard.writeText(pattern);
      setNotice("copied");
    } catch {
      setNotice("copyFailed");
    }
  }

  function exportPattern() {
    const blob = new Blob([`${JSON.stringify({ schemaVersion: 1, pattern, flags, replacement }, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "regex-pattern.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function saveSnippet() {
    setSnippets((current) => [{ pattern, flags }, ...current].slice(0, 8));
    setNotice("saved");
  }

  function insertPoint(point: number) {
    const prior = evaluation?.matches ?? [];
    if (!prior.length) return;
    setSelectedMatch((point + prior.length) % prior.length);
  }

  const selected = evaluation?.matches[selectedMatch];
  const copy = (key: WorkbenchKey) => t(key);
  return (
    <div className="regex-workbench" hidden={!open} aria-label={t("heading")}>
      <h3>{t("heading")}</h3>
      <p className="regex-workbench__help">{t("trace")}: {evaluation?.capabilities.trace ?? "Pattern evaluation runs in a time-limited local worker. No pattern or sample text is sent or saved."}</p>

      <label className="site-settings__checkbox regex-workbench__mode">
        <input type="checkbox" checked={regexEnabled} onChange={(event) => onRegexEnabledChange(event.target.checked)} />
        <span>{t("raw")}</span>
      </label>
      <p className="regex-workbench__help">{t("rawHelp")}</p>

      <fieldset className="regex-workbench__fieldset">
        <legend>{t("flags")}</legend>
        <div className="regex-workbench__flags">
          {FLAG_NAMES.map((flag) => {
            const supported = evaluation?.capabilities.flags.find((item) => item.flag === flag)?.supported ?? true;
            return (
              <label key={flag} className="regex-workbench__flag">
                <input type="checkbox" checked={flags.includes(flag)} disabled={!supported} onChange={() => onFlagsChange(toggleFlag(flags, flag))} />
                <span><code>{flag}</code> {copy(({ d: "indices", g: "global", i: "ignoreCase", m: "multiline", s: "dotAll", u: "unicode", v: "unicodeSets", y: "sticky" } as const)[flag])}</span>
              </label>
            );
          })}
        </div>
        {flags.includes("u") && flags.includes("v") && <p role="alert">{t("flagConflict")}</p>}
      </fieldset>

      <div className="regex-workbench__actions">
        <button type="button" onClick={copyPattern}>{t("copyPattern")}</button>
        <button type="button" onClick={exportPattern}>{t("export")}</button>
        <button type="button" onClick={saveSnippet}>{t("saveSnippet")}</button>
      </div>
      {notice && <p role="status" aria-live="polite">{t(notice)}</p>}

      <details className="regex-workbench__section" open>
        <summary>{t("guided")}</summary>
        <div className="regex-workbench__guided">
          <label className="site-settings__field">
            <span>{t("literal")}</span>
            <input value={literal} maxLength={512} onChange={(event) => setLiteral(event.target.value)} placeholder={t("literalPlaceholder")} />
          </label>
          <button type="button" onClick={appendLiteral}>{t("escape")}</button>
          <div className="regex-workbench__codepoint">
            <label className="site-settings__field"><span>{t("codePoint")}</span><input value={codePoint} maxLength={7} onChange={(event) => setCodePoint(event.target.value)} placeholder={t("codePointPlaceholder")} /></label>
            <button type="button" onClick={appendCodePoint}>{t("appendPoint")}</button>
          </div>
          <div className="regex-workbench__tokens">
            {GUIDED_TOKENS.map((token) => <button key={token.key} type="button" onClick={() => onInsertPattern(token.snippet, "cursor" in token ? token.cursor : undefined)}>{t(token.key)}</button>)}
          </div>
          {evaluation?.capabilities.flags.find((item) => item.flag === "v")?.supported ? (
            <div className="regex-workbench__tokens">
              <button type="button" onClick={() => { onFlagsChange(toggleFlag(flags, "v")); onInsertPattern("[a-z&&[^aeiou]]"); }}>{t("intersection")}</button>
              <button type="button" onClick={() => { onFlagsChange(toggleFlag(flags, "v")); onInsertPattern("[a-z--[aeiou]]"); }}>{t("subtraction")}</button>
            </div>
          ) : <p className="regex-workbench__help">{t("unsupportedSetOps")}</p>}
        </div>
      </details>

      <details className="regex-workbench__section">
        <summary>{t("unsupported")}</summary>
        <ul>{(evaluation?.capabilities.unsupported ?? ["Atomic groups, conditional groups, recursion/subroutines, possessive quantifiers, and inline modifiers are not supported by JavaScript RegExp."]).map((item) => <li key={item}>{item}</li>)}</ul>
      </details>

      <div className="regex-workbench__sample-grid">
        <label className="site-settings__field"><span>{t("sample")}</span><textarea value={sample} maxLength={4096} onChange={(event) => setSample(event.target.value)} placeholder={t("samplePlaceholder")} /></label>
        <label className="site-settings__field"><span>{t("replacement")}</span><input value={replacement} maxLength={4096} onChange={(event) => setReplacement(event.target.value)} placeholder={t("replacementPlaceholder")} /></label>
      </div>
      <div className="regex-workbench__sample-grid">
        <label className="site-settings__field"><span>{t("positiveCases")}</span><textarea value={positiveText} maxLength={4096} onChange={(event) => setPositiveText(event.target.value)} aria-describedby="regex-case-limit" /></label>
        <label className="site-settings__field"><span>{t("negativeCases")}</span><textarea value={negativeText} maxLength={4096} onChange={(event) => setNegativeText(event.target.value)} aria-describedby="regex-case-limit" /></label>
      </div>
      <p id="regex-case-limit" className="regex-workbench__help">{t("onePerLine")}</p>

      {error && <p className="regex-workbench__error" role="alert">{error}</p>}
      {evaluation && (
        <div className="regex-workbench__results">
          <p className="regex-workbench__engine">{t("engine")}: {evaluation.engine}</p>
          <p>{t("profile")}: {evaluation.elapsedMs.toFixed(2)} ms for 30 bounded checks.</p>
          <details className="regex-workbench__section" open>
            <summary>{t("tokens")}</summary>
            <ol className="regex-workbench__token-list">{evaluation.tokens.map((token, index) => <li key={`${token.start}-${index}`}><code>{token.text || "∅"}</code><span>{token.kind}</span><small>{token.start}–{token.end}</small></li>)}</ol>
          </details>
          <details className="regex-workbench__section" open>
            <summary>{t("matches")} ({evaluation.matches.length})</summary>
            {evaluation.matches.length === 0 ? <p>{t("noMatches")}</p> : <>
              <div className="regex-workbench__actions"><button type="button" onClick={() => insertPoint(selectedMatch - 1)} disabled={evaluation.matches.length < 2}>{t("previous")}</button><span aria-live="polite">{t("matchPosition").replace("{current}", String(selectedMatch + 1)).replace("{total}", String(evaluation.matches.length))}</span><button type="button" onClick={() => insertPoint(selectedMatch + 1)} disabled={evaluation.matches.length < 2}>{t("next")}</button></div>
              {selected && <div className="regex-workbench__match"><p><code>{selected.text || "∅"}</code> at {selected.index}–{selected.index + selected.length}</p>{selected.zeroWidth && <p>{t("zeroWidth")}</p>}<table><thead><tr><th>Group</th><th>Value</th></tr></thead><tbody><tr><td>0</td><td><code>{selected.text}</code></td></tr>{selected.groups.map((value, index) => <tr key={index}><td>{index + 1}</td><td><code>{value ?? "∅"}</code></td></tr>)}{Object.entries(selected.namedGroups ?? {}).map(([name, value]) => <tr key={name}><td>{name}</td><td><code>{value ?? "∅"}</code></td></tr>)}</tbody></table></div>}
              {evaluation.matches.length >= 100 && <p>{t("moreMatches")}</p>}
            </>}
          </details>
          <details className="regex-workbench__section" open>
            <summary>{t("cases")}</summary>
            <ul>{evaluation.caseResults.map((item, index) => <li key={index} data-state={item.expected === item.matched ? "pass" : "fail"}><strong>{item.expected === item.matched ? t("pass") : t("fail")}</strong> <code>{item.text}</code></li>)}</ul>
          </details>
          <details className="regex-workbench__section" open>
            <summary>{t("replacementPreview")}</summary><pre>{evaluation.replacementPreview}</pre>
          </details>
          <details className="regex-workbench__section" open>
            <summary>{t("risk")}</summary>
            {evaluation.riskNotes.length ? <ul>{evaluation.riskNotes.map((note) => <li key={note}>{note}</li>)}</ul> : <p>{t("noRisk")}</p>}
          </details>
          <details className="regex-workbench__section">
            <summary>{t("settingsResults")} ({evaluation.searchMatches.length})</summary>
            <ul>{evaluation.searchMatches.map((id) => <li key={id}><code>{id}</code></li>)}</ul>
          </details>
        </div>
      )}
      <div className="regex-workbench__import">
        <label className="site-settings__field"><span>{t("import")}</span><textarea value={importText} maxLength={16384} onChange={(event) => setImportText(event.target.value)} placeholder={t("importPlaceholder")} /></label>
        <button type="button" onClick={importPattern}>{t("loadImport")}</button>
      </div>
      <details className="regex-workbench__section">
        <summary>{t("snippets")}</summary>
        {snippets.length ? snippets.map((snippet, index) => <button key={`${snippet.pattern}-${index}`} type="button" className="regex-workbench__snippet" onClick={() => { onPatternChange(snippet.pattern); onFlagsChange(snippet.flags); onRegexEnabledChange(true); }}><code>/{snippet.pattern}/{snippet.flags}</code></button>) : <p>{t("noSnippets")}</p>}
      </details>
    </div>
  );
}
