# Phase 1 security assessment — DO NOT DEPLOY FIRESTORE RULES YET

The Firebase project configured in this repository is shared with other Varga applications. The `firestore.rules` in this repository contains only `pianoNeveUsers` paths and is **not** a complete representation of project-wide production rules. Deploying it as-is could remove permissions required by other applications.

## Findings
1. `pianoNeveStreetWork` and `pianoNeveRouteEdits` have no explicit rule in the checked-in file. Actual deployed rules have **not** been fetched or verified.
2. Hiding admin controls in the PWA is not authorization. Firestore rules must enforce role restrictions.
3. User status and role are read from `platformUsers/{uid}`, whose full production policy must be preserved.
4. Old `pianoNeveUsers/{uid}/{document=**}` recursively permits any subcollection for that owner. Prefer explicit paths.
5. The app exposes Firebase client configuration by design; this is not a service-account credential. Security depends on Auth and server-side Firestore policies.

## Required before deployment
- Export the current **deployed** complete Firestore rules from Firebase Console or CLI.
- Diff against the rules for Varga Gestionale and other apps using the same project.
- Merge and test specific piano-neve paths; do not replace the whole ruleset with the partial file here.
- Verify rejected read/write with an ordinary user, office role, unrelated account, banned account and admin using Firebase Emulator.
- Verify that a user cannot forge `uid`, change another user's street record or change route edits.
- Add retention limits and proper notice for employee GPS tracking; restrict access by duty and record audit logs.
- Keep deployments gated by manual review.

Example intended policy (NOT production-ready rules): signed-in and active operator may write only their own road records; admin or office may read reports; only admin may edit shared routes; users may access their own sessions and archives. Server-side checks must use the approved `platformUsers` roles and account statuses, not JavaScript flags.

## Operational limitations
Browsers cannot guarantee continuous background GPS collection. IndexedDB supports offline queues; maps, authentication and complete background operation require additional real-device validation.
