export function validateTopic(t) {
  if (
    !t ||
    typeof t.id !== "string" ||
    ["constructor", "prototype"].includes(t.id) ||
    !/^[a-z0-9-]+$/.test(t.id) ||
    typeof t.title !== "string" ||
    !Array.isArray(t.questions) ||
    !t.questions.length ||
    !Array.isArray(t.dialogue) ||
    !t.dialogue.length ||
    !Array.isArray(t.vocabulary)
  )
    throw Error("Topic JSON không hợp lệ.");
  const ids = new Set();
  for (const q of t.questions) {
    if (
      typeof q.id !== "string" ||
      !/^[a-z0-9-]+$/.test(q.id) ||
      ["constructor", "prototype"].includes(q.id) ||
      ids.has(q.id) ||
      typeof q.prompt !== "string" ||
      !Array.isArray(q.ideas) ||
      !Array.isArray(q.frames)
    )
      throw Error("Câu hỏi không hợp lệ / trùng ID.");
    ids.add(q.id);
  }
  for (const turn of t.dialogue) {
    if (
      !["A", "B"].includes(turn.role) ||
      typeof turn.text !== "string" ||
      (turn.answerId && !ids.has(turn.answerId)) ||
      (turn.questionId && !ids.has(turn.questionId))
    )
      throw Error("Lượt hội thoại không hợp lệ.");
  }
  for (const v of t.vocabulary)
    if (typeof v.text !== "string" || typeof v.meaning !== "string")
      throw Error("Từ vựng không hợp lệ.");
  for (const q of t.questions)
    if (
      !q.ideas.every((x) => typeof x === "string") ||
      !q.frames.every((x) => typeof x === "string")
    )
      throw Error("Gợi ý phải là văn bản.");
  for (const x of [...t.questions, ...t.dialogue, ...t.vocabulary])
    if (
      x.audio &&
      (!x.audio.src ||
        x.audio.script !== (x.prompt ?? x.text) ||
        !safeURL(x.audio.src))
    )
      throw Error("Audio phải khai báo src và script khớp chính xác nội dung.");
  if (t.image && !safeURL(t.image)) throw Error("Đường dẫn hình không hợp lệ.");
  return t;
}
export function safeURL(s) {
  if (typeof s !== "string" || !s || /^[\\/]/.test(s)) return false;
  try {
    const base = new URL("https://efs.invalid/efs-speaking/");
    const url = new URL(s, base);
    return url.origin === base.origin && url.pathname.startsWith(base.pathname);
  } catch {
    return false;
  }
}
export function personalScript(topic, answers, role) {
  return topic.dialogue.map((t) => {
    const personal = t.role === role && t.answerId;
    const a = personal ? answers[t.answerId] : null;
    return {
      ...t,
      text: personal
        ? a?.confirmed || "[Chưa có câu trả lời cá nhân đã xác nhận]"
        : t.text,
      audio: personal ? null : t.audio,
      personal: !!personal,
    };
  });
}
export function flashAnswer(answers, id) {
  return answers[id]?.confirmed || "";
}
