# EFS Grading — AI Engineering Instructions (V3.0)

Scope: `efs-grading/**` only. This document applies to all development and review tasks inside this directory.

## Mission and verified baseline

V4 development candidate: read `V4-RELEASE-REPORT.md` before making completion or production claims. The feature branch now adds explicit scoring policies, revision history, validated metadata restore/rollback, browser-local batch queue and a disabled-by-default single-teacher AI proxy. The sections below describe the original deployed baseline unless noted. Production status remains PARTIAL / NO-GO; no institutional auth, cloud sync or complete original-file backup exists.

EFS Grading is a teacher-controlled grading application, currently implemented as static HTML/CSS/JavaScript (`index.html`, `style.css`, `app.js`, `core.js`) with Node test scripts. It is **not** an AI-based free-writing grader or filled-bubble answer-sheet reader. It relies on deterministic key-based scoring and teacher-assigned scores for open writing.

The current three-step workflow is:
1. Teacher supplies and explicitly saves version-specific answer keys, question types, and points; saved/unsaved state is visible.
2. Teacher imports document or images, verifies extracted text, and resolves detected exam code against saved keys; ambiguity requires manual verification. A reading operation represents **one student**, even when it contains multiple pages.
3. Teacher reviews answers and scores, explicitly approves and saves the result, and can export CSV.

Reference: read `README.md` and the actual source before relying on this summary; update this file if the implementation changes.

## Non-negotiable scope boundaries
- Allowed: `efs-grading/**` only, unless the user explicitly authorizes a broader change.
- Protected: root `index.html`, `data.js`, `sets/**`, root hosting configurations and all unrelated apps.
- Do not change shared hosting configuration or services as part of a Grading task without explicit approval.
- The repository contains other applications. Changes to `main` may trigger deployments of multiple services even if only Grading files changed. Prefer a feature branch and reviewable PR; do not merge/deploy without authorization.
- Before changes, inspect working state, existing tests and downstream/shared dependencies. Do not overwrite others' changes.

## Architecture and data constraints
- Current application has no configured backend, account system, synced cloud database, AI scoring service or server-managed student records. Do not imply otherwise.
- Keys and results currently persist locally under `efs_grading_v2` in browser localStorage; no automatic cross-device sync or automatic backup. A manual JSON download exists but no restore/import feature is implemented. Preserve compatibility and existing records.
- Library loading currently depends on CDN-hosted PDF.js, Mammoth and Tesseract.js. OCR limitations are substantial for handwriting, Vietnamese writing and filled/circled multiple-choice sheets.
- Preserve leading zeros in exam codes and prevent guessing a version from unlabeled answer patterns.
- Never silently substitute an unknown explicit exam code with another code.
- No scoring of contradictory version identifiers or conflicting duplicate answers without resolution.
- Existing results must preserve the key and point scale used at grading time.
- Do not equate files uploaded in one reading operation with different student submissions.
- Treat images, student identity and grading records as sensitive educational data; avoid external transfers without approved controls.

## Pedagogical grading invariants
- Separate **document extraction uncertainty** from **answer grading uncertainty**.
- MCQ and short-answer scoring can be deterministic; any normalization/variant policy must be explicit and tested.
- Open writing remains teacher-scored until an AI-assisted workflow has been designed, calibrated, authorized and validated. AI draft scores alone must not become final high-stakes grades.
- For short answers, distinguish objective-required errors from irrelevant surface deviations. Do not auto-accept or auto-penalize novel variants without validated scoring criteria and teacher review.
- Preserve teacher authority to inspect, correct, override and finalize every grade.
- Record rubric/key version and user-approved changes when expanding scoring capabilities.

## Development workflow
1. INSPECT: read affected files, instructions, test cases, integration touchpoints and Git state.
2. SPECIFY: document desired/actual behavior, acceptance criteria, cases that must not regress and data/privacy impacts.
3. PLAN: choose the smallest reversible patch with explicit scope; no opportunistic refactoring.
4. IMPLEMENT: modify only allowed paths, following existing conventions.
5. VERIFY: use real fixtures and representative negative/edge cases; distinguish tested from not tested.
6. REVIEW: inspect the diff, regression impact, security/privacy and release consequences.
7. REPORT: changed paths, commands/tests and results, remaining limitations; mark PASS/PARTIAL/BLOCKED honestly.

Tasks with destructive data operations, significant schema changes, new paid services, production deploy or cross-app changes require explicit approval.

## Verified test commands
Run from `efs-grading/`, with Node 20+:
- `npm install --ignore-scripts`
- `npm test`
- `npm run test:readers`

These commands are documented by the project but should only be reported as PASS when actually executed and their output inspected. OCR reader tests can require English language data download (`EFS_OCR_DATA` may point to a local traineddata file). Existing UI tests use jsdom, not a real mobile browser. Real-phone camera, Safari/Chrome CDN worker loading, image quality and handwriting need device testing.

## Specific risk gates
- **Version gate:** saved answer key visible, no mistaken automatic selection, unknown/conflicting codes safely rejected.
- **Recognition gate:** extracted text displayed and editable; uncertainty and wrong/blank extraction require teacher inspection.
- **Scoring gate:** objective answers judged by documented criteria; teacher scores written responses; every point is reviewable.
- **Persistence gate:** explicit confirmation, no accidental data overwrite, export before browser data clearing, migration plans for future storage.
- **Privacy gate:** school/student data access, retention and transmission risks reviewed before adding backend or AI services.
- **Release gate:** regression tests, manual phone checks where appropriate, deployment dependency review and rollback plan before production.

## Original roadmap — consult V4 report for partial implementation
P0: robust version management, clear import/error paths, backup/export, and safer one-submission review.
P1: proper multi-student batch segmentation and QR/barcode/printed-sheet recognition only after sample-based feasibility study and confirmation UI.
P2: AI-assisted free-response review with rubric and targeted spelling/grammar criteria, human approval, calibration dataset and model-cost/error measurements.
P3: durable synchronized storage and school deployment only after privacy, access control, retention, backup and operating costs are agreed.

Do not claim a roadmap item exists until implemented and tested.
