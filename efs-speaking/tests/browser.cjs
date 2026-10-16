const { chromium } = require("playwright");
require("node:fs").mkdirSync(
  require("node:path").join(__dirname, "artifacts"),
  { recursive: true },
);
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ["microphone"],
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base =
    process.env.EFS_TEST_URL || "http://127.0.0.1:8000/efs-speaking/";
  const nav = (label) =>
    page.locator("#nav button").filter({ hasText: label }).click();
  await page.goto(base);
  await page.getByRole("heading", { name: "What makes you, you?" }).waitFor();
  assert.equal(
    await page.locator("img.hero").evaluate((e) => e.naturalWidth > 0),
    true,
  );
  assert.equal(await page.locator(".play").count(), 0);
  await nav("Listen & Notice");
  await page.locator("#transcript").click();
  assert.ok(
    await page
      .locator(".turn")
      .first()
      .textContent()
      .then((x) => x.includes("What do you enjoy")),
  );
  await nav("My Own Ideas");
  await page.locator("#answer-hobby").fill("I enjoy chess with my sister.");
  await page.locator(".confirm").first().click();
  await nav("Listen & Respond");
  await page.locator("#flip").click();
  assert.equal(
    await page.locator("#flash-text").textContent(),
    "I enjoy chess with my sister.",
  );
  await nav("My Own Ideas");
  await page.locator("#answer-hobby").fill("I love painting on Sundays.");
  await nav("Listen & Respond");
  assert.equal(
    await page.locator("#flash-text").textContent(),
    "I enjoy chess with my sister.",
  );
  await nav("My Own Ideas");
  await page.locator(".confirm").first().click();
  await nav("Listen & Respond");
  assert.equal(
    await page.locator("#flash-text").textContent(),
    "I love painting on Sundays.",
  );
  await nav("Personalized Shadowing");
  await page.locator("#role").selectOption("B");
  await page.locator("#nextturn").click();
  assert.equal(
    await page.locator("#turn-text").textContent(),
    "I love painting on Sundays.",
  );
  assert.equal(await page.locator(".play").count(), 0);
  await page.locator("#role").selectOption("A");
  await page.locator("#nextturn").click();
  assert.ok(
    (await page.locator("#turn-text").textContent()).includes("drawing"),
  );
  for (const mode of ["Shadowing", "Role Practice", "Listen & Repeat"])
    await page.locator("#mode").selectOption(mode);
  await page.locator("#swap").click();
  assert.equal(await page.locator("#role").inputValue(), "B");
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#exportScript").click();
  assert.ok((await downloadPromise).suggestedFilename().endsWith(".txt"));
  assert.ok(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("efs_speaking_v1")).scripts[
        "my-hobby-B"
      ].text.includes("I love painting on Sundays."),
    ),
  );
  await nav("Speak Together");
  await page.locator("#nextturn").click();
  assert.ok(
    (await page.locator("#turn-text").textContent()).includes("drawing"),
  );
  await page.locator("#swap").click();
  assert.equal(await page.locator("#role").inputValue(), "A");
  await nav("My Own Ideas");
  const recorder = page.locator('[data-rec="hobby"]');
  await recorder.locator(".record").click();
  await recorder.locator(".stop:not([disabled])").waitFor();
  await page.waitForTimeout(1100);
  await recorder.locator(".stop").click();
  await recorder.locator(".clips audio").waitFor();
  const recording = recorder.locator(".clips audio");
  await recording.evaluate((a) => a.play());
  await page.waitForTimeout(300);
  assert.equal(await recording.evaluate((a) => a.error), null);
  assert.ok(await recording.evaluate((a) => a.currentTime > 0));
  await page.reload();
  await page.locator('[data-rec="hobby"] .clips audio').waitFor();
  await page.getByRole("button", { name: "Xóa bản ghi" }).click();
  await page.waitForFunction(
    () => !document.querySelector('[data-rec="hobby"] .clips audio'),
  );
  assert.equal(
    await page.locator("#answer-hobby").inputValue(),
    "I love painting on Sundays.",
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: require("node:path").join(__dirname, "artifacts/mobile.png"),
    fullPage: true,
  });
  await nav("Discover");
  await page.screenshot({
    path: require("node:path").join(__dirname, "artifacts/discover.png"),
    fullPage: true,
  });
  const topic = await (
    await context.request.get(base + "data/my-hobby.json")
  ).json();
  topic.id = "second-topic";
  topic.title = "Imported topic";
  const wav = Buffer.alloc(32044);
  wav.write("RIFF");
  wav.writeUInt32LE(32036, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(32000, 40);
  await page.route("**/tests/fixture.wav", (route) =>
    route.fulfill({ contentType: "audio/wav", body: wav }),
  );
  topic.questions[0].audio = {
    src: "tests/fixture.wav",
    script: topic.questions[0].prompt,
  };
  await page.locator("#import").setInputFiles({
    name: "topic.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(topic)),
  });
  await page.getByText("Đã nhập topic.", { exact: false }).waitFor();
  assert.equal(await page.locator("#topic").inputValue(), "second-topic");
  await page.locator(".play").first().click();
  await page.waitForTimeout(200);
  assert.ok(
    !(await page.locator("#status").textContent()).includes("Không phát"),
  );
  await nav("Listen & Respond");
  assert.equal(await page.locator(".play").count(), 1);
  await page.locator("#flip").click();
  assert.equal(await page.locator(".play").count(), 0);
  await page.reload();
  await page
    .locator('#topic option[value="second-topic"]')
    .waitFor({ state: "attached" });
  assert.equal(
    await page.locator('#topic option[value="second-topic"]').count(),
    1,
  );
  assert.deepEqual(errors, []);
  for (const label of [
    "Discover",
    "Listen & Notice",
    "My Own Ideas",
    "Listen & Respond",
    "Personalized Shadowing",
    "Speak Together",
  ]) {
    await nav(label);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await nav("Discover");
  await page.screenshot({
    path: require("node:path").join(__dirname, "artifacts/desktop.png"),
    fullPage: true,
  });
  await context.close();
  const denied = await browser.newContext();
  await denied.grantPermissions([]);
  const p = await denied.newPage();
  await p.goto(base);
  await p.locator("#nav button").filter({ hasText: "My Own Ideas" }).click();
  await p.evaluate(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Denied", "NotAllowedError"));
  });
  await p.locator(".record").first().click();
  await p.getByText("Không mở được micro.", { exact: false }).waitFor();
  await browser.close();
  console.log(
    "PASS Chromium mobile: confirmed/edit flashcards, roles/modes, no wrong audio, real MediaRecorder/playback/IndexedDB/delete, reload, topic import, mic denial, no overflow or JS errors.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
