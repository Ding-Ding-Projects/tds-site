"use client";

import { useState } from "react";
import { CHATGPT_RESEARCH_PROMPT } from "@/lib/chatgpt-research-prompt.mjs";

export function ResearchPromptCard() {
  const [status, setStatus] = useState("");

  async function copyPrompt() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard-unavailable");
      await navigator.clipboard.writeText(CHATGPT_RESEARCH_PROMPT);
      setStatus("Prompt copied. / 提示已複製。");
    } catch {
      setStatus("Clipboard unavailable. Select the prompt text below and copy it. / 剪貼簿用唔到，請喺下方選取提示文字再複製。");
    }
  }

  return (
    <section className="card research-prompt" id="research-prompt" aria-labelledby="research-prompt-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">DEEP RESEARCH / 深度研究</span>
          <h2 id="research-prompt-title">Copy a current TDS research prompt / 複製最新 TDS 研究提示</h2>
        </div>
        <a href="https://github.com/Ding-Ding-Projects/tds-site/blob/main/docs/research/chatgpt-research-prompt.md" target="_blank" rel="noreferrer">Source and updates ↗</a>
      </div>
      <p>Paste this prompt into ChatGPT Deep Research. It asks for dated citations, complete mode coverage, distinct Solo and co-op findings, and clear unknowns. / 將以下提示貼入 ChatGPT Deep Research，要求附日期來源、完整模式資料、分開整理 Solo 同合作玩法，以及清楚標示未知資訊。</p>
      <button className="run-button research-prompt__copy" type="button" onClick={copyPrompt}>Copy research prompt / 複製研究提示</button>
      <p className="research-prompt__status" role="status" aria-live="polite">{status}</p>
      <pre className="research-prompt__code" tabIndex={0} aria-label="Copy-ready research prompt / 可複製研究提示"><code>{CHATGPT_RESEARCH_PROMPT}</code></pre>
    </section>
  );
}
