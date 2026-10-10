# V4 implementation report — 2026-10-10

## Decision: PARTIAL / NO-GO

A working development candidate was implemented, not just a plan. Production release remains blocked by real-device validation, real AI calibration, institutional access/data controls and complete original-file recovery. No main merge, production deployment, external student-data transmission or paid provider call was performed.

## Audit and scope

- Repository: `englishfocusstudio-bit/efs-practice`.
- Baseline main: `1d134092e106bf3029f21d29a86ad5d851fa7edd`.
- Inspected existing open draft PR #1 and governance branch at `a55449455bc374bc14ac95bfc3c2e58d2af0f616`.
- New implementation branch: `efs-grading/completion-v4-20261010`, preserving PR #1's backup and governance work.
- Read scoped AGENTS, README, source and existing tests. Only `efs-grading/**` changes. Root application, question sets, shared hosting and Render services were not changed.
- Existing baseline tests/readers passed before modifications.

## Implemented and exercised

| Area | Evidence | Status |
|---|---|---|
| Saved keys, dirty state, automatic code routing | Existing UI/code tests preserved | PASS |
| Key revisions and snapshots | Batch test changes current key after reading; old batch still uses revision 1 | PASS |
| Target scoring policies | Explicit punctuation/case/variants/partial rules; unknown variant pending; teacher reason gate | PASS |
| Header/answer parsing | Regression for code `001` being mistaken for question 1; multi-line response test | PASS |
| Multiple student files/pages | Actual TXT reads, explicit page grouping, orphan/unknown/conflicting identities; PDF reader returns separate pages | PARTIAL — TXT batch exercised; PDF/image batch/device fixtures still needed |
| Error isolation and reload | Unsupported file between valid files, preserved queue, failed processing on interruption | PASS for exercised cases |
| Original storage | IndexedDB storage/reopen using fake-indexeddb; original links/images in UI | PARTIAL — browser quota/device behavior not exercised |
| Teacher approvals | Individual gates, staged eligibility, reopening clears candidate, repeat bulk approval does not duplicate, approved queue UI lock | PASS |
| JSON restore and rollback | Invalid data rejected before writes, quota failure preserves active state, pre-restore and rollback checkpoints | PASS for metadata; original blobs excluded |
| CSV and true Excel export | Existing CSV escaping; independent Python ZIP CRC/XML validation, Unicode/leading zeros/formula strings | PASS structurally; Excel desktop visual check not run |
| AI integration | Actual fixed-endpoint provider adapter; mocked provider contract, score/evidence bounds, refusal/truncation, retry budget, consent/stale-response client gates | PASS integration contract; NOT model accuracy |
| Backend security controls | HTTP tests for unauthorized access, wrong origin, oversized input, restricted file serving and attempt limit | PASS tested controls; NOT production security sign-off |
| Real DOCX/PDF/image reading | Existing integration fixtures extracted and code recognized by actual libraries/OCR | PASS, with PDF polyfill/font warnings |

Commands executed with dependencies in a scratch QA directory and Node 24:

```
NODE_PATH=/workspace/scratch/44b5b9473691/qa/node_modules npm --prefix efs-grading test
NODE_PATH=/workspace/scratch/44b5b9473691/qa/node_modules EFS_OCR_DATA=/workspace/scratch/44b5b9473691/qa npm --prefix efs-grading run test:readers
```

Observed latest full run: 22 Node tests plus 2 backup tests passed, and all 4 DOM workflow scripts passed. Real reader fixtures also passed. `git diff --check` and syntax checks passed.

Do not substitute synthetic/mock test results for real student grading evaluation. jsdom is a DOM simulator; fake-indexeddb is an IndexedDB simulator. Neither establishes Safari/Chrome camera, persistence, layout, worker/CDN or handwriting accuracy.

## Required before production

1. **Teacher calibration dataset:** anonymized real responses and teacher criterion scores, covering correct/incorrect target grammar, irrelevant punctuation/spelling/plural deviations, partial answers, blank answers, handwriting/OCR errors and student prompt injection. Use a held-out set; agree thresholds before observing results. Measure per-criterion absolute error, aggregate score error/bias, severe over/undergrading, uncertainty routing, teacher override rate, latency and cost. No samples or server API/model credentials were available; no real model run occurred.
2. **Phone/browser QA:** real Android Chrome and iPhone Safari camera/photo upload, PDF workers, 20-file limits, interrupted/reloaded reading, storage quota and visual review of originals beside OCR. Include representative multi-page papers and adversarial swapped/missing headers. No real phone was available.
3. **School data/auth:** decide account and role model, durable audit/approval enforcement, encrypted synchronized storage, consent/retention/purge policy, original-file backup/restore and recovery drill. Current implementation is browser-local/single-teacher, not an institutional multi-user service.
4. **Operational controls:** review TLS proxy/trusted forwarding, secrets rotation, persistent cost/rate budgets, monitoring, redaction and provider data policy. In-memory attempt limits reset on backend restart.
5. **Feature gaps:** QR/filled-bubble recognition absent; pre-reading durable DRAFT queue/retry without selecting files again absent; multi-student DOCX/TXT splitting and attaching anonymous pages need a stronger manual resolution flow; criteria-level teacher editing and production-grade filtering/performance tests remain open. A completed read queue resumes; an active reader does not resume mid-page.
6. **Release approval:** review the feature PR, resolve relation with PR #1, rerun checks in target environment, inspect actual phone/browser results and agree an isolated deployment. Main is watched by multiple services; no release action is authorized by this report.

## Recovery and rollback

No deployed service changed, so production rollback is currently unnecessary. For an approved future pilot: download JSON and separately preserve original files before updating; keep the last known-good commit/build. Additive fields preserve legacy keys/results and old result key snapshots. Restore has validation and a pre-restore checkpoint; rollback keeps the displaced data in a separate checkpoint. Restoring metadata on another browser cannot recover IndexedDB originals. A revert of source alone does not undo a data restore; recover data using the validated backup/checkpoint workflow. Test these steps with representative data before approval.
