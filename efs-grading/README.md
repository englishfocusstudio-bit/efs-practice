# EFS Grading — V4 development candidate

**PARTIAL / NO-GO for production.** This feature branch has not been merged or deployed. All changes are inside `efs-grading/`. The deployed static pilot does not acquire these features until a separately approved release.

## Three steps

1. **Prepare and save keys.** Save each exam code once, with title, numbered questions, types and points. Saved/unsaved status is visible. Editing a key creates a numbered revision and preserves the previous revision. Expand “Mục tiêu & quy tắc chấm” for objective, excluded errors, explicit short-answer policies and an essay rubric. Rubric format is one criterion per line: `past | Uses the correct past tense | 2`; criterion points must total the question maximum.
2. **Read papers.** Use the camera input or select DOCX, PDF, TXT or page images. Single-student mode retains the previous workflow. For multiple students, select batch mode and read the batch. Each page needs explicit `Mã HS: HS-001` (or `Student ID: HS-001`) and `Mã đề: 001` (or `Exam code: 001`). Pages join only on both exact identifiers, inside the current batch. Numeric/answer-pattern/filename guesses are not used. Unknown/conflicting codes, missing identities, contradictory answers and failed files stay separate for teacher review; later files continue. PDF pages are handled separately. A DOCX/TXT containing several students is not automatically split into independent submissions; separate those papers or resolve the exception. Open an item to compare original links/images with editable recognized text.
3. **Review and approve.** Each paper retains its key revision from reading time. Every question permits a teacher score override; objective-score overrides require a reason. Written responses require a teacher score or a teacher-selected AI draft. Teacher corrections, score decisions, key snapshot, approval event and time are saved. Approve individually, or stage a fully checked paper and bulk-approve only staged candidates. Reopening a staged paper clears its eligibility. Approved queue items are locked in the UI; regrading creates a separate record, preserving earlier approvals. Export CSV or a real `.xlsx` workbook. Both preserve formula-like text safely; Excel keeps exam codes as strings.

## Targeted scoring

Legacy keys keep their prior comparison behavior: case and repeated spaces are ignored, spelling/punctuation remain significant. New policies are explicit per question:

- Case sensitivity and punctuation normalization are separate controls.
- Accepted full-credit variants are listed with `|` in the key.
- Partial-credit answers are listed as `answer = points`, one per line. Conflicting/overlapping rules are rejected.
- Enable review of unknown variants to keep novel nonblank responses pending instead of assigning zero.
- Missing `s`, extra/missing letters and spelling errors are **not** blanket-normalized. If outside the objective, provide reviewed variants/partial rules or let the teacher decide. Excluded-error text informs teacher/AI review; it is not an automatic deterministic acceptance rule.
- Essays use objective, rubric, exemplar and excluded errors. They are not scored by exact matching against the exemplar. Multi-line numbered answers retain continuation text; numbered passages inside an essay can still need correction after extraction.

Empty answers are still zero in objective grading after teacher inspection. OCR uncertainty is distinct from a rubric score. No filled-bubble/circled-choice recognition or QR recognition is implemented.

## Data and recovery

The existing `efs_grading_v2` localStorage key is retained. Additive fields include key revisions/history, queue records, approval audit events, teacher overrides/corrections and AI draft evidence. Existing results retain their original questions and points. Invalid saved data is preserved and blocks new writes rather than being silently replaced.

Batch originals are stored in IndexedDB `efs_grading_originals`; queue metadata and extracted text are stored in localStorage. A storage failure leaves a failed item requiring attention. A reload preserves completed reads and marks an interrupted PROCESSING item FAILED; retry requires selecting the file again. State DRAFT is recognized by the schema but is not yet a persisted pre-reading upload queue.

JSON backup contains keys, grade records, text and queue metadata, **not the original blobs**. Restore validates keys, rubrics, scores, totals and queue structure before writing, and keeps the previous raw state under `efs_grading_before_restore`. Non-approved staged candidates lose bulk-approval eligibility on restore. “Quay về trước khôi phục” returns to that checkpoint, retaining the replaced state under `efs_grading_before_rollback`. Export/download backups before restoring or clearing browser data. Restoring on another device cannot recreate original images; missing originals require reupload. Checkpoints store one latest recovery state and are not an institutional backup system.

There is no automatic phone/PC sync, cloud student database, durable institutional audit signature, retention/purge interface, school account/role system or complete original-file backup. localStorage/IndexedDB can be edited or cleared by the browser owner. UI approval locks do not provide server-side tamper resistance.

## Optional AI backend — single-teacher development pilot

The existing Render static service cannot execute this backend. No hosting configuration was changed.

With Node 20+, run `npm start` from this directory. Default bind is `127.0.0.1:3000`; static routes are allowlisted. AI is disabled unless all of these server-side settings exist:

- `EFS_ALLOW_EXTERNAL_AI=true`
- `OPENAI_API_KEY` (server only; never put it in frontend code/storage)
- `EFS_AI_MODEL` (explicit model supporting Chat Completions strict Structured Outputs; no default model is selected)
- `EFS_TEACHER_TOKEN` (at least 32 characters, separate from provider credentials)
- Optional `EFS_AI_DAILY_ATTEMPTS` (1–500; default 50)

Remote binding also requires `EFS_PUBLIC_ORIGIN=https://...`; use a correctly configured TLS reverse proxy and firewall before any remote test. This implementation is not a reviewed production deployment recipe. The browser asks for the teacher access token and explicit per-session consent. Remove identifying details from the response/exemplar before using AI. Only question/rubric text and the answer are sent, never student ID or original files intentionally. Free text may still contain identifying information; this is not automated redaction.

The proxy checks bearer credentials, exact request origin, JSON input size, consent, valid rubric, concurrency and request rate. The fixed provider endpoint avoids user-supplied destinations. Each provider attempt, including one bounded retry for 429/5xx, consumes a daily attempt budget. Inputs are bounded, output is capped at 1,500 completion tokens, and provider timeout is 15 seconds per attempt. Counters are in memory and reset on restart: configure provider-side spend controls separately; this is not a durable currency budget.

Student text is designated untrusted in the prompt. Strict Structured Outputs are followed by application validation of criterion IDs, score bounds and verbatim evidence. Refusal, truncation, missing/invalid evidence and provider errors produce no grade. Injection defenses are risk reduction, not proof against all attacks. AI scores remain drafts requiring teacher inspection/approval. A changed answer invalidates a pending response and previous proposal.

Official API reference used: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat). Provider transport tests use mocks to verify the integration contract; they do **not** establish model grading accuracy.

## Verification

```
npm install --ignore-scripts
npm test
npm run test:readers
```

`npm test` includes Node logic, HTTP proxy controls, ZIP/XML Excel verification with Python 3 stdlib, actual HTML script loading and jsdom workflow tests. `fake-indexeddb` tests persistence mechanics. Reader tests use real DOCX, PDF and printed-image fixtures; `EFS_OCR_DATA` can point to an existing `eng.traineddata.gz` directory. CDNs still provide Mammoth, PDF.js, Tesseract workers/WASM/language data. Browser network/worker operation and real devices require separate testing.

See [V4-RELEASE-REPORT.md](V4-RELEASE-REPORT.md) for verified evidence, remaining gates and rollback. Passing these tests is not production approval.
