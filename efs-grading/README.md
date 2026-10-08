# EFS Grading v2

Static teacher application; all changes stay in `efs-grading/`. No backend, API key, student account, or AI scoring service is configured.

## Three-step workflow

1. Supply a teacher-verified answer key, select question types and set each question's maximum points. Save each exam code separately.
2. Read student DOCX, PDF, TXT, or images, or capture a page. Compare extracted text with the original. Numbered answers are mapped to the key; text can be corrected.
3. Review answers and points. Multiple choice and short answers use deterministic comparison. Open writing requires teacher scores against the supplied rubric. Save only after approval; export CSV.

Input: `1 A`, `2 B`, `3 school`, one answer per line. Compact multiple-choice keys such as `1A 2B 3C` also work. Short-answer variants use `twelve | 12` in the key. Comparison ignores case and repeated spaces; punctuation and substantive spelling remain significant. Blank or unrecognized answers score zero after teacher review. Duplicate contradictory responses block review. OCR does not determine which option is circled or filled on an answer sheet. Do not pass a question paper containing all the printed answer options as if it were a numbered answer list.

PDF text is extracted with PDF.js; pages with fewer than 10 extracted characters fall back to OCR. DOCX uses Mammoth raw text extraction. Tesseract English OCR runs locally, including scanned PDFs. Handwriting and Vietnamese text are not reliably supported. PDFs with mixed text and embedded handwritten answers may not trigger OCR; supply clear page images instead and check recognition. Each file is limited to 20 MB; up to 20 uploaded files / 60 MB combined, and PDFs to 20 pages each. Reading is sequential.

Libraries, workers, WASM and English language data are downloaded from public CDNs. Document content is not intentionally uploaded to a server. Results and answer keys persist in this browser's localStorage under `efs_grading_v2`, with no cross-device sync or backup. Old `efs_grading_online_pilot_v1` storage is left intact; simulated pilot scores are not imported. Export CSV before clearing browser data. CSV protects formula-like text and preserves Vietnamese with UTF-8 BOM. Existing saved results include their original answer key and maximum points even when the setup changes.

## Run tests

From this directory, with Node 20+:

```
npm install --ignore-scripts
npm test
npm run test:readers
```

Reader integration tests use actual DOCX, PDF and printed-image fixtures. OCR may download language data; `EFS_OCR_DATA` can point to a directory with `eng.traineddata.gz`. Tests check real extraction and numbered-answer mapping. UI tests exercise DOM behavior through jsdom, not a real browser. Phone camera capture, visual layout, CDN Worker loading in Safari/Chrome, and handwriting accuracy still require device QA with representative exam papers.

## Deploy

Existing Render service `efs-grading-pilot` publishes only `efs-grading` from `main`. The separate EFS Practice service also watches `main`; a commit can trigger its existing auto-deploy even though its application files are unchanged. No hosting configuration or other application files are modified by this release.
