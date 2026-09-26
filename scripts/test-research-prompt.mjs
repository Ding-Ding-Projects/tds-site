import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CHATGPT_RESEARCH_PROMPT } from "../lib/chatgpt-research-prompt.mjs";

const markdown = await readFile(new URL("../docs/research/chatgpt-research-prompt.md", import.meta.url), "utf8");
const page = await readFile(new URL("../components/research-prompt-card.tsx", import.meta.url), "utf8");
const planner = await readFile(new URL("../components/strategy-lab.tsx", import.meta.url), "utf8");
const inventory = await readFile(new URL("../docs/guide/completeness.md", import.meta.url), "utf8");
const match = markdown.match(/```text\n([\s\S]*?)\n```/u);

test("the planner prompt exactly matches the canonical copy-ready document", () => {
  assert.ok(match);
  assert.equal(CHATGPT_RESEARCH_PROMPT, match[1]);
  assert.match(CHATGPT_RESEARCH_PROMPT, /separate SOLO section/i);
  assert.match(CHATGPT_RESEARCH_PROMPT, /Cite every changing or disputed claim/i);
  assert.match(CHATGPT_RESEARCH_PROMPT, /Exclude talk and user namespaces, private or deleted pages/i);
  assert.match(CHATGPT_RESEARCH_PROMPT, /do not use superseded revisions as research content/i);
  assert.match(CHATGPT_RESEARCH_PROMPT, /individual license is verified/i);
  assert.match(page, /navigator\.clipboard/);
  assert.match(page, /role=\"status\" aria-live=\"polite\"/);
  assert.match(page, /tabIndex=\{0\}/);
  assert.match(page, /Clipboard unavailable/);
  assert.match(planner, /<ResearchPromptCard\s*\/>/);
  const withoutCard = planner.replace(/<ResearchPromptCard\s*\/>/u, "");
  assert.doesNotMatch(withoutCard, /<ResearchPromptCard\s*\/>/u);
});

test("the completeness inventory names the prompt UI and catches a missing feature row", () => {
  const row = inventory.split(/\r?\n/u).find((line) => line.startsWith("| Copy-ready deep-research prompt |"));
  assert.ok(row);
  const damaged = inventory.replace(row, "");
  assert.equal(damaged.split(/\r?\n/u).some((line) => line.startsWith("| Copy-ready deep-research prompt |")), false);
});
test("prompt drift fails when the canonical document loses its fenced prompt", () => {
  const damaged = markdown.replace(/```text[\s\S]*?```/u, "");
  assert.equal(damaged.match(/```text\n([\s\S]*?)\n```/u), null);
});
