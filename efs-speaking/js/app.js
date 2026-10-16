import { validateTopic, personalScript, flashAnswer } from "./core.js";
import { load, save, clip } from "./storage.js";
import { services } from "./services.js";
const $ = (id) => document.getElementById(id),
  state = load();
state.topics ||= {};
state.answers ||= {};
state.progress ||= {};
state.scripts ||= {};
const steps = [
  "Discover",
  "Listen & Notice",
  "My Own Ideas",
  "Listen & Respond",
  "Personalized Shadowing",
  "Speak Together",
];
let topic,
  step = 0,
  role = "B",
  mode = "Listen & Repeat",
  turnIndex = 0,
  cardIndex = 0,
  flipped = false,
  transcript = false,
  recording = false,
  pendingMic = false;
let media = null,
  activeAudio = null,
  objectURLs = [],
  renderToken = 0;
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const message = (s) => {
  $("status").textContent = s;
};
function persist() {
  try {
    save(state);
    return true;
  } catch {
    message(
      "Không lưu được: kiểm tra dung lượng và quyền lưu của trình duyệt.",
    );
    return false;
  }
}
function answers() {
  return (state.answers[topic.id] ||= {});
}
function audioHTML(item, text) {
  const a = item.audio;
  return a && a.script === text
    ? `<button class="play" data-src="${esc(a.src)}">▶ Nghe audio EFS</button>`
    : '<p class="muted">◌ Chưa có audio cho đúng nội dung này.</p>';
}
function stopAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
}
function bindAudio() {
  document.querySelectorAll(".play").forEach(
    (b) =>
      (b.onclick = () => {
        stopAudio();
        activeAudio = new Audio(b.dataset.src);
        activeAudio.onerror = () =>
          message("Không tải được audio. Kiểm tra file trong topic.");
        activeAudio
          .play()
          .catch(() => message("Không phát được audio. Hãy chạm để thử lại."));
      }),
  );
}
function support() {
  return topic.vocabulary
    .map(
      (x) =>
        `<details><summary>${esc(x.text)}</summary><p>${esc(x.meaning)}</p>${audioHTML(x, x.text)}</details>`,
    )
    .join("");
}
function intro(n, title, desc) {
  return `<span class="sectionno">${String(n).padStart(2, "0")} / SPEAKING JOURNEY</span><h2>${esc(title)}</h2><p class="intro muted">${esc(desc)}</p>`;
}
function go(n) {
  if (recording || pendingMic) {
    message("Hãy dừng ghi âm trước khi chuyển bước.");
    return;
  }
  step = n;
  state.progress[topic.id] = n;
  persist();
  render();
}
function render() {
  const token = ++renderToken;
  stopAudio();
  objectURLs.forEach(URL.revokeObjectURL);
  objectURLs = [];
  $("topic-tag").textContent = topic.title;
  $("breadcrumb").textContent = `${topic.title} / ${steps[step]}`;
  $("nav").innerHTML = steps
    .map(
      (s, i) =>
        `<button data-step="${i}" class="${i === step ? "active" : ""}" ${i === step ? 'aria-current="step"' : ""}><span>0${i + 1}</span>${s}</button>`,
    )
    .join("");
  document
    .querySelectorAll("[data-step]")
    .forEach((b) => (b.onclick = () => go(Number(b.dataset.step))));
  let html = "";
  if (step === 0) {
    html =
      intro(
        1,
        "What makes you, you?",
        "Khám phá sở thích. Nghe, thử các cụm từ, rồi kể câu chuyện của chính bạn.",
      ) +
      `<img class="hero" src="${esc(topic.image || "assets/hobbies.svg")}" alt="${esc(topic.imageAlt || "Sở thích")}"><div class="notice">${esc(topic.audioPolicy || "Audio chỉ phát khi có file và script khớp nội dung.")} Hình minh họa SVG do dự án tự tạo.</div><div class="grid"><section class="card"><h3>Words to connect</h3>${support()}</section><section class="card"><h3>Start with curiosity</h3>${topic.questions.map((q) => `<p>${esc(q.prompt)}</p>${audioHTML(q, q.prompt)}`).join("")}<button class="primary" id="start">Bắt đầu luyện tập →</button></section></div>`;
  }
  if (step === 1) {
    html =
      intro(
        2,
        "Listen for the connection",
        "Chú ý cách bắt đầu, phản hồi và hỏi tiếp. Hội thoại minh họa cố định, không phải câu trả lời cá nhân.",
      ) +
      `<button id="transcript" aria-expanded="${transcript}">${transcript ? "Ẩn" : "Hiện"} transcript</button><section class="card">${topic.dialogue.map((t) => `<div class="turn"><div class="purpose">${esc(t.purpose)}</div><b>Vai ${t.role}</b>${audioHTML(t, t.text)}${transcript ? `<p>${esc(t.text)}</p>` : ""}</div>`).join("")}</section>`;
  }
  if (step === 2) {
    html =
      intro(
        3,
        "Make it your own.",
        "Chọn ý tưởng nếu phù hợp. Viết bằng ý của bạn và xác nhận trước khi luyện. App không tự sửa hoặc thêm ý.",
      ) +
      topic.questions
        .map((q) => {
          const a = answers()[q.id] || {};
          return `<section class="card"><h3>${esc(q.prompt)}</h3><details><summary>Language Support · Tiếng Việt</summary><p>${esc(q.translation)}</p>${support()}</details><p class="purpose">Idea Bank · Gợi ý, không tự điền</p>${q.ideas.map((i) => `<span class="pill">${esc(i)}</span>`).join("")}<p class="purpose">Natural Speaking Frames</p>${q.frames.map((f) => `<p>${esc(f)}</p>`).join("")}<label for="answer-${esc(q.id)}">Câu trả lời của tôi</label><textarea id="answer-${esc(q.id)}" data-answer="${esc(q.id)}">${esc(a.draft ?? a.confirmed ?? "")}</textarea><p class="answerstate" id="state-${esc(q.id)}">${a.confirmed && a.draft === a.confirmed ? "Đã xác nhận" : a.confirmed ? "Bản sửa chưa xác nhận; flashcard vẫn dùng bản đã xác nhận." : "Chưa xác nhận câu trả lời."}</p><button class="primary confirm" data-id="${esc(q.id)}">Xác nhận câu trả lời của tôi</button><div class="recorder" data-rec="${esc(q.id)}"></div></section>`;
        })
        .join("");
  }
  if (step === 3) {
    cardIndex %= topic.questions.length;
    const q = topic.questions[cardIndex],
      a = flashAnswer(answers(), q.id);
    html =
      intro(
        4,
        "Your voice. Your answer.",
        "Nghe hoặc đọc câu hỏi. Tự nói trước khi lật thẻ; mặt sau luôn dùng câu bạn đã xác nhận.",
      ) +
      `<p class="muted">THẺ ${cardIndex + 1} / ${topic.questions.length}</p><section class="card flash"><span class="purpose">${flipped ? "YOUR CONFIRMED ANSWER" : "LISTEN & RESPOND"}</span><p id="flash-text">${esc(flipped ? a || "Chưa có câu trả lời đã xác nhận. Hãy quay lại My Own Ideas." : q.prompt)}</p>${!flipped ? audioHTML(q, q.prompt) : '<p class="muted">Audio cá nhân hóa: chưa có.</p>'}</section><div class="actions"><button id="prev">← Thẻ trước</button><button id="flip" class="primary">${flipped ? "Xem câu hỏi" : "Tôi đã nói · Lật thẻ"}</button><button id="next">Thẻ tiếp →</button></div>`;
  }
  if (step === 4 || step === 5) {
    const script =
      step === 4 ? personalScript(topic, answers(), role) : topic.dialogue;
    turnIndex %= script.length;
    const turn = script[turnIndex];
    html =
      intro(
        step + 1,
        step === 4 ? "Find your rhythm." : "Keep the conversation going.",
        step === 4
          ? "A/B là hai vai hội thoại. Lượt trả lời của bạn dùng nội dung đã xác nhận; lượt đối tác giữ script mẫu."
          : "Luyện hội thoại mẫu luân phiên trên một thiết bị. Đổi vai để tập hỏi và phản hồi; không có đối tác AI.",
      ) +
      `<div class="actions"><label>Vai của tôi <select id="role"><option ${role === "A" ? "selected" : ""}>A</option><option ${role === "B" ? "selected" : ""}>B</option></select></label>${step === 4 ? `<label>Cách luyện <select id="mode">${["Listen & Repeat", "Shadowing", "Role Practice"].map((m) => `<option ${m === mode ? "selected" : ""}>${m}</option>`).join("")}</select></label>` : ""}<button id="swap">Đổi vai A ↔ B</button></div><div class="notice">${step === 4 ? (mode === "Listen & Repeat" ? "Nghe đúng audio của lượt này, sau đó dừng và nhắc lại. Nếu thiếu audio, chỉ có thể luyện đọc." : mode === "Shadowing" ? "Nói bám theo đúng audio của lượt này. Thiếu audio cá nhân: chưa thể shadowing phần cá nhân." : "Nghe lượt đối tác; đến lượt bạn thì tự nói. Chuyển lượt bằng nút bên dưới.") : "Đối tác: nghe/đọc lượt mẫu. Đến lượt bạn: phản hồi theo script. Chuyển lượt thủ công."}</div><section class="card turn ${turn.role === role ? "mine" : ""}"><span class="purpose">LƯỢT ${turnIndex + 1} / ${script.length} · ${turn.role === role ? "ĐẾN LƯỢT BẠN" : "ĐỐI TÁC"}</span><h3>Vai ${turn.role}</h3><p id="turn-text">${esc(turn.text)}</p>${turn.personal ? '<p class="muted">Script cá nhân · Chưa có audio cá nhân hóa.</p>' : mode === "Role Practice" && step === 4 && turn.role === role ? '<p class="muted">Tự nói lượt của bạn.</p>' : audioHTML(turn, turn.text)}</section><div class="actions"><button id="backturn">← Lượt trước</button><button id="nextturn" class="primary">${turnIndex === script.length - 1 ? "Luyện lại" : "Lượt tiếp theo →"}</button></div><details><summary>Xem ${step === 4 ? "script cá nhân" : "hội thoại mẫu"} đầy đủ</summary><div id="script">${script.map((t) => esc(t.role + ": " + t.text)).join("\n")}</div></details>${step === 4 ? '<button id="exportScript">Lưu script cá nhân (.txt)</button>' : ""}<section class="card"><h3>Ghi âm lượt luyện của bạn</h3><div class="recorder" data-rec="practice"></div></section>`;
  }
  $("view").innerHTML = html;
  bindAudio();
  if ($("start")) $("start").onclick = () => go(1);
  if ($("transcript"))
    $("transcript").onclick = () => {
      transcript = !transcript;
      render();
    };
  for (const t of document.querySelectorAll("[data-answer]"))
    t.oninput = () => {
      const id = t.dataset.answer;
      answers()[id] ||= {};
      answers()[id].draft = t.value;
      persist();
      $("state-" + id).textContent =
        "Bản sửa chưa xác nhận; chưa thay câu trả lời trên flashcard.";
    };
  for (const b of document.querySelectorAll(".confirm"))
    b.onclick = () => {
      if (recording || pendingMic) {
        message("Hãy dừng ghi âm trước khi xác nhận câu trả lời.");
        return;
      }
      const id = b.dataset.id,
        value = $("answer-" + id).value.trim();
      if (!value) {
        message("Hãy nhập câu trả lời trước khi xác nhận.");
        return;
      }
      const previous = answers()[id];
      answers()[id] = {
        draft: value,
        confirmed: value,
        confirmedAt: new Date().toISOString(),
      };
      if (!persist()) {
        answers()[id] = previous;
        return;
      }
      message("Đã lưu câu trả lời bạn xác nhận.");
      render();
    };
  if ($("flip")) {
    $("flip").onclick = () => {
      flipped = !flipped;
      render();
    };
    $("prev").onclick = () => {
      cardIndex =
        (cardIndex - 1 + topic.questions.length) % topic.questions.length;
      flipped = false;
      render();
    };
    $("next").onclick = () => {
      cardIndex++;
      flipped = false;
      render();
    };
  }
  if ($("role")) {
    $("role").onchange = () => {
      if (recording || pendingMic) {
        $("role").value = role;
        message("Hãy dừng ghi âm trước khi đổi vai.");
        return;
      }
      role = $("role").value;
      turnIndex = 0;
      render();
    };
    $("swap").onclick = () => {
      if (recording || pendingMic) return;
      role = role === "A" ? "B" : "A";
      turnIndex = 0;
      render();
    };
    if ($("mode"))
      $("mode").onchange = () => {
        if (recording || pendingMic) {
          $("mode").value = mode;
          return;
        }
        mode = $("mode").value;
        render();
      };
    for (const [id, delta] of [
      ["backturn", -1],
      ["nextturn", 1],
    ])
      $(id).onclick = () => {
        if (recording || pendingMic) return;
        turnIndex =
          (turnIndex + delta + topic.dialogue.length) % topic.dialogue.length;
        render();
      };
  }
  if ($("exportScript"))
    $("exportScript").onclick = () => {
      const text = personalScript(topic, answers(), role)
        .map((t) => t.role + ": " + t.text)
        .join("\n");
      state.scripts[topic.id + "-" + role] = {
        role,
        text,
        savedAt: new Date().toISOString(),
      };
      if (persist()) {
        download(
          new Blob([text], { type: "text/plain;charset=utf-8" }),
          "efs-" + topic.id + "-role-" + role + ".txt",
        );
        message(
          "Đã lưu script cá nhân riêng trên thiết bị và xuất file. Không tạo audio.",
        );
      }
    };
  for (const el of document.querySelectorAll("[data-rec]")) recorder(el, token);
}
function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function recorder(el, token) {
  const qid = el.dataset.rec;
  el.innerHTML =
    '<p class="rec-state">Bản ghi được lưu trên trình duyệt này. Nội dung chữ và bản ghi được lưu riêng; không có STT.</p><div class="actions"><button class="record">● Ghi âm</button><button class="stop" disabled>■ Dừng & lưu</button></div><div class="clips"></div>';
  const start = el.querySelector(".record"),
    stop = el.querySelector(".stop");
  start.disabled =
    !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder;
  if (start.disabled)
    el.querySelector(".rec-state").textContent =
      "Ghi âm không khả dụng. Cần HTTPS/localhost, quyền micro và MediaRecorder.";
  async function list() {
    try {
      const all = (await clip("getAll")).filter(
        (c) => c.topicId === topic.id && c.questionId === qid,
      );
      if (token !== renderToken) return;
      const box = el.querySelector(".clips");
      box.replaceChildren();
      for (const c of all) {
        const div = document.createElement("div"),
          p = document.createElement("p"),
          audio = document.createElement("audio"),
          del = document.createElement("button"),
          dl = document.createElement("button");
        p.className = "muted";
        p.textContent =
          new Date(c.created).toLocaleString() +
          " · " +
          (c.script || "Không có script xác nhận tại lúc ghi");
        audio.controls = true;
        const url = URL.createObjectURL(c.blob);
        objectURLs.push(url);
        audio.src = url;
        del.textContent = "Xóa bản ghi";
        del.onclick = async () => {
          try {
            await clip("delete", c.id);
            URL.revokeObjectURL(url);
            await list();
          } catch {
            message("Không xóa được bản ghi.");
          }
        };
        dl.textContent = "Tải bản ghi";
        dl.onclick = () =>
          download(
            c.blob,
            "efs-recording." +
              (c.blob.type.includes("mp4")
                ? "m4a"
                : c.blob.type.includes("ogg")
                  ? "ogg"
                  : "webm"),
          );
        div.append(p, audio, dl, del);
        box.append(div);
      }
    } catch {
      message("Không truy cập được kho bản ghi IndexedDB.");
    }
  }
  await list();
  start.onclick = async () => {
    if (recording || pendingMic) return;
    pendingMic = true;
    start.disabled = true;
    let stream;
    try {
      stopAudio();
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (token !== renderToken) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const mime = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((x) => MediaRecorder.isTypeSupported(x));
      media = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
      const parts = [],
        snapshot =
          qid === "practice"
            ? (step === 4
                ? personalScript(topic, answers(), role)
                : topic.dialogue
              )
                .map((t) => t.role + ": " + t.text)
                .join("\n")
            : flashAnswer(answers(), qid);
      const topicId = topic.id;
      media.ondataavailable = (e) => {
        if (e.data.size) parts.push(e.data);
      };
      media.onstop = async () => {
        clearTimeout(limit);
        stream.getTracks().forEach((t) => t.stop());
        recording = false;
        stop.disabled = true;
        start.disabled = false;
        try {
          const blob = new Blob(parts, { type: media.mimeType });
          if (!blob.size) throw Error();
          await clip("put", {
            id: crypto.randomUUID(),
            topicId,
            questionId: qid,
            script: snapshot,
            created: Date.now(),
            blob,
          });
          message(
            "Đã lưu bản ghi trên thiết bị. Bạn có thể nghe lại, tải xuống hoặc xóa.",
          );
          await list();
        } catch {
          message("Không lưu được bản ghi; kiểm tra dung lượng/quyền lưu.");
        }
      };
      media.onerror = () => {
        message("Ghi âm gặp lỗi.");
        if (media.state !== "inactive") media.stop();
      };
      media.start();
      recording = true;
      stop.disabled = false;
      el.querySelector(".rec-state").textContent =
        "● Đang ghi · Giới hạn 2 phút / bản ghi";
      const limit = setTimeout(() => {
        if (media.state === "recording") media.stop();
      }, 120000);
      stop.onclick = () => {
        if (media.state !== "inactive") media.stop();
      };
    } catch (e) {
      stream?.getTracks().forEach((t) => t.stop());
      start.disabled = false;
      message("Không mở được micro. Hãy cấp quyền và kiểm tra thiết bị.");
    } finally {
      pendingMic = false;
    }
  };
}
$("topic").onchange = () => {
  if (recording || pendingMic) {
    $("topic").value = topic.id;
    message("Hãy dừng ghi âm trước khi đổi topic.");
    return;
  }
  topic = state.topics[$("topic").value];
  step = state.progress[topic.id] || 0;
  turnIndex = cardIndex = 0;
  flipped = false;
  render();
};
$("import").onchange = async (e) => {
  if (recording || pendingMic) {
    message("Hãy dừng ghi âm trước khi nhập topic.");
    return;
  }
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1000000) throw Error("Topic tối đa 1 MB.");
    const t = validateTopic(JSON.parse(await file.text()));
    if (state.topics[t.id])
      throw Error("Topic ID đã tồn tại. Hãy dùng ID mới để không ghi đè.");
    state.topics[t.id] = t;
    if (!persist()) {
      delete state.topics[t.id];
      return;
    }
    options();
    topic = t;
    cardIndex = turnIndex = 0;
    flipped = false;
    $("topic").value = t.id;
    step = 0;
    render();
    message(
      "Đã nhập topic. File media phải tồn tại dưới efs-speaking/ theo đường dẫn khai báo.",
    );
  } catch (err) {
    message(err.message);
  }
};
function options() {
  $("topic").innerHTML = Object.values(state.topics)
    .map((t) => `<option value="${esc(t.id)}">${esc(t.title)}</option>`)
    .join("");
}
window.addEventListener("beforeunload", () => {
  if (media?.state === "recording") media.stop();
});
(async () => {
  try {
    const registry = await fetch("data/topics.json").then((r) => {
      if (!r.ok) throw Error("Không tải được danh mục topic.");
      return r.json();
    });
    for (const entry of registry) {
      const r = await fetch("data/" + entry.file);
      if (!r.ok) throw Error("Không tải được topic.");
      const t = validateTopic(await r.json());
      state.topics[t.id] = t;
    }
    options();
    topic = Object.values(state.topics)[0];
    step = Math.min(5, state.progress[topic.id] || 0);
    render();
  } catch (e) {
    message(e.message);
  }
})();
