"use strict";

function inspectTokens(source) {
  const tokens = [];
  for (let index = 0; index < source.length;) {
    const start = index;
    const current = source[index];
    if (current === "\\") {
      index += Math.min(2, source.length - index);
      if (source[index - 1] === "u" && source[index] === "{") {
        const end = source.indexOf("}", index + 1);
        index = end < 0 ? source.length : end + 1;
      } else if ((source[index - 1] === "p" || source[index - 1] === "P" || source[index - 1] === "k") && source[index] === "<") {
        const end = source.indexOf(">", index + 1);
        index = end < 0 ? source.length : end + 1;
      }
      const token = source.slice(start, index);
      const kind = /^\\[1-9]/u.test(token) || /^\\k</u.test(token) ? "backreference"
        : /^\\[bB]/u.test(token) ? "boundary"
          : /^\\[dDsSwW]/u.test(token) ? "character class shorthand"
            : /^\\[pP]\{/u.test(token) ? "Unicode property escape"
              : /^\\u\{/u.test(token) ? "Unicode code point"
                : "escape";
      tokens.push({ text: token, kind, start, end: index });
      continue;
    }
    if (current === "[") {
      let nested = 0;
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") { index += 2; continue; }
        if (source[index] === "[") nested += 1;
        if (source[index] === "]") {
          if (nested === 0) { index += 1; break; }
          nested -= 1;
        }
        index += 1;
      }
      const token = source.slice(start, index);
      tokens.push({ text: token, kind: token.includes("&&") || token.includes("--") ? "character class set operation" : "character class", start, end: index });
      continue;
    }
    if (current === "(") {
      const prefixes = [
        ["(?<=", "positive lookbehind"], ["(?<!", "negative lookbehind"], ["(?<", "named capture"],
        ["(?:", "non-capturing group"], ["(?=", "positive lookahead"], ["(?!", "negative lookahead"],
        ["(?>", "atomic group, unsupported by this engine"], ["(?(", "conditional group, unsupported by this engine"],
      ];
      const found = prefixes.find(([prefix]) => source.startsWith(prefix, index));
      index += found ? found[0].length : 1;
      tokens.push({ text: source.slice(start, index), kind: found?.[1] ?? "capturing group", start, end: index });
      continue;
    }
    if (current === "^" || current === "$") {
      index += 1;
      tokens.push({ text: current, kind: current === "^" ? "start anchor" : "end anchor", start, end: index });
      continue;
    }
    if (current === "|") {
      index += 1;
      tokens.push({ text: current, kind: "alternation", start, end: index });
      continue;
    }
    if (current === "*" || current === "+" || current === "?" || current === "{") {
      const quantifierMatch = source.slice(index).match(/^(?:[*+?]|\{\d+(?:,\d*)?\})\??/u);
      if (quantifierMatch) {
        index += quantifierMatch[0].length;
        const lazy = quantifierMatch[0].endsWith("?");
        tokens.push({ text: quantifierMatch[0], kind: lazy ? "lazy quantifier" : "greedy quantifier", start, end: index });
        continue;
      }
    }
    index += 1;
    tokens.push({ text: current, kind: current === ")" ? "group end" : "literal or punctuation", start, end: index });
  }
  return tokens;
}

function riskNotes(pattern) {
  const notes = [];
  if (/(?:\([^()]*(?:\+|\*|\{\d+,?\d*\})[^()]*\)|\[[^\]]+\])(?:\+|\*|\{\d+,?\d*\})/u.test(pattern)) {
    notes.push("Nested repetition may cause expensive backtracking on adversarial input.");
  }
  if (/(?:\.\*|\.\+).*(?:\.\*|\.\+)/u.test(pattern)) {
    notes.push("Multiple broad wildcards may explore many possible partitions.");
  }
  if (pattern.length > 256) notes.push("Long patterns are harder to inspect and may have more complex runtime behavior.");
  return notes;
}

function compileTest(source, flags) {
  const expression = new RegExp(source, flags);
  return expression;
}

function evaluate(data) {
  const { pattern, flags, sample, replacement, positiveCases, negativeCases, searchItems } = data;
  if (typeof pattern !== "string" || pattern.length > 512) throw new Error("Pattern must be a string of at most 512 characters.");
  const values = [sample, replacement, ...(positiveCases ?? []), ...(negativeCases ?? []), ...(searchItems ?? []).map((item) => item.text)];
  if (values.some((value) => typeof value !== "string" || value.length > 4096)) throw new Error("Each sample or replacement must be a string of at most 4,096 characters.");
  if ((positiveCases?.length ?? 0) + (negativeCases?.length ?? 0) > 12 || (searchItems?.length ?? 0) > 32) throw new Error("The case or search-item limit is exceeded.");
  if (new TextEncoder().encode(values.join("")).byteLength > 24 * 1024) throw new Error("The combined local evaluation input exceeds 24 KiB.");
  if (!/^[dgimsuvy]*$/u.test(flags) || new Set(flags).size !== flags.length) throw new Error("One or more regular-expression flags are invalid or duplicated.");

  const expression = compileTest(pattern, flags);
  const scanFlags = flags.includes("g") ? flags : `${flags}g`;
  const scan = compileTest(pattern, scanFlags);
  const matches = [];
  for (const match of sample.matchAll(scan)) {
    if (matches.length >= 100) break;
    matches.push({ text: match[0], index: match.index, length: match[0].length, groups: match.slice(1), namedGroups: match.groups ?? null, indices: match.indices ?? null, zeroWidth: match[0].length === 0 });
  }
  const replacementPreview = sample.replace(expression, replacement);
  const caseResults = [
    ...(positiveCases ?? []).map((text) => ({ expected: true, matched: compileTest(pattern, flags).test(text), text })),
    ...(negativeCases ?? []).map((text) => ({ expected: false, matched: compileTest(pattern, flags).test(text), text })),
  ];
  const searchMatches = [];
  for (const item of searchItems ?? []) {
    const testExpression = compileTest(pattern, flags);
    testExpression.lastIndex = 0;
    if (testExpression.test(item.text)) searchMatches.push(item.id);
  }

  const profileExpression = compileTest(pattern, flags);
  const start = performance.now();
  for (let index = 0; index < 30; index += 1) {
    profileExpression.lastIndex = 0;
    profileExpression.test(sample);
  }
  const elapsedMs = performance.now() - start;
  const setOperations = pattern.includes("&&") || pattern.includes("--");
  const usesUnicodeSets = flags.includes("v");
  const unsupported = [
    "Atomic groups (?>...) are not supported by JavaScript RegExp.",
    "Conditional groups are not supported by JavaScript RegExp.",
    "Recursive groups and subroutine calls are not supported by JavaScript RegExp.",
    "Possessive quantifiers are not supported by JavaScript RegExp.",
    "Inline modifiers are not supported by JavaScript RegExp.",
  ];
  return {
    pattern, flags, matches, caseResults, searchMatches, replacementPreview,
    tokens: inspectTokens(pattern), riskNotes: riskNotes(pattern), elapsedMs,
    engine: `JavaScript RegExp · ${self.navigator?.userAgent ?? "browser engine"}`,
    capabilities: {
      flags: ["d", "g", "i", "m", "s", "u", "v", "y"].map((flag) => {
        try { new RegExp("", flag); return { flag, supported: true }; }
        catch { return { flag, supported: false }; }
      }),
      setOperationsSupported: usesUnicodeSets,
      setOperationsUsedWithoutVFlag: setOperations && !usesUnicodeSets,
      unsupported,
      trace: "This JavaScript engine does not expose internal backtracking steps. Timing and risk notes are bounded diagnostics, not a proof of runtime for all inputs.",
    },
  };
}

self.onmessage = (event) => {
  const { requestId, payload } = event.data ?? {};
  try {
    self.postMessage({ requestId, result: evaluate(payload) });
  } catch (error) {
    self.postMessage({ requestId, error: error instanceof Error ? error.message : "Regular-expression evaluation failed." });
  }
};
