# EFS Security — Security-first operation

## Scope
EFS Practice is an intentionally public educational site. EFS Grading is a teacher-oriented browser app handling potentially sensitive student scores.

## Immediate account protections (administrator action required)
1. Enable passkeys or 2-step verification for Google, GitHub, and Render accounts; use a password manager.
2. Review GitHub collaborators and connected applications; remove unused access.
3. Enable GitHub secret scanning, push protection, and dependency alerts where available. Rotate any exposed secret; removing it from current files does not erase Git history.
4. Do not enter real student names, ID numbers or identifiable results into a public/shared browser until data protection and access controls are reviewed.
5. Never use OAuth client secrets, refresh tokens or platform publishing tokens in static front-end JavaScript or public repository files.

## Current architecture risks
- Repository and static Render URLs are public. This is appropriate for anonymous learning content but does not constitute access control for teacher data.
- The Grading app uses localStorage for results on the current browser. Browser/device access or script executing in the same origin may expose those values; clear data on shared machines and use anonymized test material.
- The Grading reader loads JavaScript/PDF/OCR libraries from third-party CDNs. Before deployment, evaluate vendoring/pinning and a compatible CSP and test every reader.
- Both Render sites deploy from the repository's main branch; implement path/build isolation and an approval workflow to prevent unintended cross-deploys.

## Rules for future publishing integration
- Use official OAuth with minimum scopes, validated redirect URIs, state/PKCE as applicable.
- Put refresh tokens in protected server-side storage; no browser localStorage or static hosting secrets.
- Require administrator approval for each publication batch, record platform IDs, implement idempotency and emergency revoke.
- Delete temporary video files only after all required upload/processing confirmations and retention checks.

## Change control
No security control should be labelled active until verified in the deployed environment. Security fixes must pass tests and a human approval gate prior to production merging. Do not disclose student information in issues or logs.
