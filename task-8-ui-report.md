# Task 8 — bounded account workspace UI polish

## Status

**DONE_WITH_CONCERNS — source implementation and offline checks complete; authenticated mounted visual review remains pending.** Independent review is next; this report is not an independent review or approval to publish.

The approved `.superpowers/sdd/staged-inventing-karp/task-8-ui-brief.md` was read first. No design approval was reopened. No rebrand, invented metrics, fake specialist access, role change, live OTP, profile save, upload, logout, or recovery action was performed.

## Delivered against the seven approved changes

1. Shared account-scoped RTL workspace header, current-section navigation with `aria-current="page"`, `max-w-5xl`, 16/24px gutters. Existing global header and bottom navigation remain untouched.
2. Client primary task is **جستجوی متخصصان**; specialist primary task is **تکمیل پروفایل حرفه‌ای**. Only the supplied real display name is used. Unconnected services are a quiet, truthful secondary section without unsupported actions or financial tiles.
3. Saved professional summary combines actual title/avatar/publication status, independent read-only verification (including unavailable), and the saved public URL with its publication caveat.
4. Forms group introduction/skills, service categories/city, collaboration conditions, and private address. Narrative fields remain full-width; short fields use two columns at wider widths. Masked phone and role are visibly grouped as read-only. Field names, constraints, ID values, null/clear semantics, parsers and callbacks are preserved.
5. Save remains the primary native form submit action. Review is a separate secondary panel, explicitly operating on saved data only, with a disabled pending-review label. Reload is subordinate and accessible. No sticky or duplicate save action was introduced. Existing alert/status notices, operation gates, authoritative reload recovery locks and revision keys remain in place.
6. Checklist uses only the last authoritative ProfileDto title/category/city. Optional avatar/gallery facts are separate. No percentage, completion score, verification inference, or unsaved-form success claim.
7. Media workspace shows actual empty/selected/uploaded/in-progress/uncertain presentation, with the explicit select → upload → attach sequence. Existing consent/capability gating, public-URL warning, codec warning, partial-upload attachment instructions and uncertain-outcome warnings remain. Saved gallery uses actual images at 4:3, real media IDs, existing revision handling, and detach-not-delete wording. No automatic upload, assignment, retry, or migration was added.

## Brand, accessibility and motion

Existing local Yekan, yellow/blue/black identity, semantic light/dark tokens and shared primitives were retained; no new palette, font, dependency, global CSS or shared Button/Input/Badge restyling. Account-scoped treatment uses 16px controls, 24px cards and 32px media containers, visible focus, 44px action targets, semantic fieldsets/legends, labelled controls, visible public-purpose disclosure and live feedback. Existing reduced-motion handling and useGSAP/contextSafe Button lifecycle were preserved. No new GSAP instance or reveal animation was introduced; essential forms never start hidden.

Installed skills actually loaded/applied:
- `frontend-design:frontend-design`: preserved the approved brand; task hierarchy, restrained layout and direct Persian action copy.
- `ui-ux-pro-max:ui-ux-pro-max`: focused local searches for form labels, announced errors and keyboard access, plus Next.js client-component guidance. No generated palette or architecture override was adopted.
- `motion-design`: restrained corporate, 200ms scoped interaction treatment; no decorative entry choreography or ambient motion.
- `gsap-skills:gsap-react`: checked existing shared Button useGSAP/contextSafe/SSR lifecycle; preserved it without introducing new GSAP code.
- `superpowers:test-driven-development` and `superpowers:verification-before-completion`: test-first presentation coverage and evidence-backed reporting.

Relevant installed Next.js `use-client` guide was read before implementation.

## Exact change inventory

**8 source/test files: 6 production UI files and 2 test files.** Five existing production files modified; one production file and two test files added.

Modified:
- `src/components/sections/ClientDashboard.tsx`
- `src/components/sections/ProDashboard.tsx`
- `src/components/sections/owner/OwnerEditor.tsx`
- `src/components/sections/owner/OwnerForms.tsx`
- `src/components/sections/owner/MediaUpload.tsx`

Added:
- `src/components/sections/owner/AccountWorkspace.tsx`
- `src/components/sections/owner/workspace-render.test.ts`
- `src/components/sections/owner/workspace-presentation.test.ts`

Three root handoff artifacts: `task-8-ui-before.snapshot`, this `task-8-ui-report.md`, and `review-task-8-ui.diff`. The review diff contains exactly the 8 source/test files, including full new-file hunks; it intentionally excludes the report, baseline snapshot and evidence logs.

Nine evidence logs under `.superpowers/sdd/staged-inventing-karp/`:
`task-8-ui-red.log`, `task-8-ui-red-presentation.log`, `task-8-ui-focused.log`, `task-8-ui-full.log`, `task-8-ui-tsc.log`, `task-8-ui-lint.log`, `task-8-ui-webpack.log`, `task-8-ui-build-location.log`, `task-8-ui-snapshot-diff.log`.

## RED → GREEN and verification actually executed

### RED

- New SSR presentation regression file run before implementation: **6 tests, 1 passed, 5 failed**. Failures covered missing common max width/current navigation/primary tasks, missing semantic form groups/read-only identity group, and missing upload-stage presentation. The pre-existing unsupported-purpose safety case already passed; it is a preservation test, not a claimed new RED.
- New summary/helper/review tests run before those exports existed: **6 tests, 0 passed, 6 failed** because the new exports/components were absent. This is explicitly missing-feature RED, not a claim that six existing implementations failed behavioral assertions.

### GREEN

All Node commands used the established real TSX/alias loader, not bare Node or source-grep assertions:

```sh
node --import ./.superpowers/sdd/staged-inventing-karp/task-7e-test-loader.mjs --test src/components/sections/owner/workspace-render.test.ts src/components/sections/owner/workspace-presentation.test.ts src/components/sections/owner/owner-render.test.ts src/lib/owner-ui.test.ts src/lib/owner-client.test.ts
```

Focused: **36 tests passed, 0 failed**.

```sh
node --import ./.superpowers/sdd/staged-inventing-karp/task-7e-test-loader.mjs --test $(find src -name '*.test.ts' -print | sort)
```

Full source Node suite, run once after implementation: **276 tests passed, 0 failed, 0 skipped, 0 cancelled, 0 todo** (258 top-level entries; nested tests account for the higher total). **12 new tests** across the two new files. Coverage includes real React SSR for dashboards, forms, media workspace, saved summary and review panel; factual checklist projection, whitespace/missing-field cases, pending/recovery-disabled review projection, all 9 publication × verification combinations, consent ordering, unsupported purposes and existing uncertain-write/failed-reread recovery controls. These are real component renders; they are not mounted authenticated OwnerEditor interaction tests or screenshots.

Other checks:
- `./node_modules/.bin/tsc --noEmit --incremental false`: **exit 0**.
- Scoped ESLint on all 8 changed source/test files: **exit 0, no diagnostics**.
- Offline Webpack production build of an isolated source copy: **exit 0**, compiled successfully, TypeScript completed, **8/8 static pages** generated; account/dashboard/pro routes registered.
- `git diff --check`: **exit 0**. `git diff --no-index --check /dev/null` for each of the 3 new source/test files and this report emitted **no whitespace diagnostics**; no-index returned 1 because new-file content differs from `/dev/null`. `git apply --reverse --check review-task-8-ui.diff`: **exit 0**, confirming the packaged diff matches the current source without applying/reverting anything.
- Fresh pre-edit snapshot captured **157 tracked source/config/package files**. Comparison confirms exactly **5 baseline files modified**, all within the approved section components. OwnerEditor action/gate/recovery logic before its ready-layout return, MediaUpload operation handlers, and form submission parsing match baseline exactly. Snapshot comparison supplements—not replaces—the behavior tests.
- Reviewed body/query save-422 fix was not modified or reverted. No backend/auth/BFF/coordinator/contracts/query/state-architecture/global primitives/config/dependencies changed.

Build isolation: copied source/public and existing non-secret build inputs to a fresh directory under `$TMPDIR`, reused installed dependencies with a symlink, and ran `node node_modules/next/dist/bin/next build --webpack` there. No `.env` or credentials were copied, no server was started, and the active development `.next` tree was not replaced. The temporary build path is in the build-location log. An initial preparation attempt stopped because the repository has no `package-lock.json`; the corrected preparation omitted that nonexistent file. No dependency installation occurred.

Known environment diagnostics: macOS `failed to copy trust settings of system certificate-25291` lines appeared in the focused test/build output, but those commands exited successfully. Full-repository ESLint was not run; the brief identifies four pre-existing helper errors, which were not changed or independently re-audited here. No claim of a globally clean lint run is made.

## Live visual checks actually done — important limitation

Used only native preview tools attached to the **already running port 3002** server. No launch configuration write, server start/restart/stop, alternate browser workaround, role change, auth action, or mutating request was initiated.

- `preview_list` confirmed the existing `karban-local-wordpress-test` server.
- `preview_snapshot` showed the existing `/account` view at **بازیابی نشست** (expired access), not an authenticated account editor. The current user was supplied as client; no specialist session was available or fabricated.
- `preview_inspect("main")` confirmed the actual recovery page used local Yekan, RTL, dark foreground `rgb(247, 250, 252)` and a 270px pane width.
- **One actual screenshot was taken and viewed**, of that existing dark recovery page only. It is not a screenshot of the polished workspace, dashboard, specialist editor, forms or gallery. The existing very narrow preview pane was left as found.
- No viewport or color-scheme override was set, so there was no test override to reset. No light-mode, mobile/tablet/desktop/ultrawide comparison, keyboard interaction, mounted form-state transition, or polished-page DOM style verification is claimed.

The screenshot is the native preview tool result in this session; no synthetic production route, fake authentication fixture, SSR HTML substituted into the browser, or screenshot of invented data was used.

## Remaining operator / independent review work

1. Operator must restore a legitimate client session themselves before live read-only checks of the revised client dashboard/account presentation. The previously reviewed and LIVE client-tested save-422 fix remains untouched, but its live test was not repeated in this task.
2. Operator must sign in as a real specialist—without changing the current client's role or impersonating another identity—before mounted `/pro` and `/pro/profile` visual checks. Review mobile 320px+, tablet, desktop and ultrawide; light/dark; focus/keyboard; long real labels; actual saved summary/checklist; pending review; real gallery/media states; safe-area/bottom navigation clearance. Reset any viewport override used in that later review.
3. Specialist upload/attach/detach/save/review tests require the operator/controller's separately authorized live data workflow. They were not performed here. Existing offline safety regressions are not substitutes for those live tests.
4. Independent review of `review-task-8-ui.diff` remains pending. No commit, push, subagent, permission/configuration change, database/seed/account change, or external/admin network request was made.
