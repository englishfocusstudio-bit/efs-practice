import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateTopic, personalScript, flashAnswer } from "../js/core.js";
const topic = JSON.parse(
  await readFile(new URL("../data/my-hobby.json", import.meta.url)),
);
test("valid topic and rejection of mismatched audio scripts", () => {
  validateTopic(topic);
  const t = structuredClone(topic);
  t.questions[0].audio = { src: "assets/a.mp3", script: "Wrong content" };
  assert.throws(() => validateTopic(t));
  t.questions[0].audio = {
    src: "https://example.com/a.mp3",
    script: t.questions[0].prompt,
  };
  assert.throws(() => validateTopic(t));
});
test("flashcards use only confirmed personal content and reflect confirmation edits", () => {
  const a = { hobby: { draft: "I like football." } };
  assert.equal(flashAnswer(a, "hobby"), "");
  a.hobby.confirmed = "I like reading.";
  assert.equal(flashAnswer(a, "hobby"), "I like reading.");
  a.hobby.confirmed = "I like swimming.";
  assert.equal(flashAnswer(a, "hobby"), "I like swimming.");
});
test("A/B roles preserve partner and prevent sample audio on personal scripts", () => {
  const a = { hobby: { confirmed: "I play chess." } };
  const b = personalScript(topic, a, "B");
  assert.equal(b[1].text, "I play chess.");
  assert.equal(b[1].audio, null);
  assert.equal(b[0].text, topic.dialogue[0].text);
  const roleA = personalScript(topic, a, "A");
  assert.equal(roleA[1].text, topic.dialogue[1].text);
  assert.ok(b[3].text.includes("Chưa có"));
});
