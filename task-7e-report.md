# Task7E — account/profile UI, real portfolio and auth completion

## Status

**Source DONE_WITH_CONCERNS. Implemented and offline verified; browser verification BLOCKED / NOT RUN. Independent review and operator-authorized local integration tests remain required. This is not a claim of live profile completion, upload readiness, production readiness, or final visual acceptance.**

Latest final evidence supersedes the earlier 258/261-test checkpoints: **56/56 focused tests, 262/262 full Node tests, TypeScript, all-delta scoped ESLint, offline Next 16.3 Webpack build, and whitespace checks PASS.**

## Scope, baseline and preservation

- Read the exact Task7E brief and root Task7D report before implementation. Read installed Next 16 Server/Client Components and async cookies guidance before writing application code.
- Used executing-plans, TDD, frontend-design, motion-design, systematic-debugging and verification skills. Existing approved branding/design remained authoritative: no restarted design approval, rebrand, font change or new dependency.
- Fresh baseline: `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7e-before.snapshot/`.
- Final snapshot delta: **39 source/test files: 21 existing modified, 18 new, no deletions**. Includes already-untracked baseline files; not merely the diff against HEAD. All other snapshotted source/test files unchanged.
- Stable review diff: `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/review-task-7e.diff`.
- Machine-readable exact file manifest: `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7e-delta.json`.
- `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, and existing `.claude/launch.json` are byte-identical to their captured baseline/copy. No env file, secret, dependency, lock file, plugin, backend schema, seed or geography source was changed.
- Existing user/controller work was preserved, including the current MobileMenu version. No snapshot restoration or externally changed menu reversion was performed.
- One implementation writer. No subagents, commits, branch/worktree changes, live WordPress HTTP, auth/OTP/SMS operations, uploads, DB operations, payment operations, network activation, or server launch.

## Completed modules and stable routes

### `/account`

- Shared guarded account page for legitimate client and specialist roles. Server composition calls `readOwnerAccount()` and `readOwnerMediaCapabilities()` directly; cities come from the existing public taxonomy helper. No self HTTP and no cookie writes during render.
- Real account name, masked readonly login phone, readonly role, personal city by real ID, and independent account avatar.
- Account form submits only `display_name` and `account_city_id`; independent explicit avatar writes submit `avatar_id`. Null clears are explicit. No role/owner/user/email/password/phone mutation fields.
- Name 100-character backend limit, safe integer IDs and backend plain-text constraints are reused rather than independently invented.

### `/pro/profile`

- Specialist-only direct-server-read composition. A client is sent to `/dashboard` before any specialist profile read. Anonymous/lost session and unavailable/configuration states are distinguished.
- Real title, bio, skills, category IDs, service-city ID, availability, experience, price hint, PRIVATE address and separate professional avatar. Optional values can be cleared; category selection is by ID, not guessed labels or hardcoded database IDs.
- Exact Task7D validators enforce title 160, bio 4000, skills 1000, price hint 200, address 500, up to 10 unique categories and experience 0–80. UI explicitly explains that current backend plain text does not accept newlines/HTML.
- Save is not publish. Submit sends exactly `{}`. Draft/pending/publish status comes only from returned DTOs; a pending profile cannot be resubmitted from the UI. Published edits explain possible return to review.
- Stable encoded public slug link. Optional actual verification is readonly text; absent verification is unavailable, not an invented badge.
- Missing taxonomy options disable the text/taxonomy form instead of replacing existing IDs with guessed values. Missing upload capabilities disable the picker.

### Public portfolio

- Public detail contract accepts `empty`, `unavailable`, or actual normalized image arrays. Parser allowlists `{id,url,type:'image',caption}` and drops private metadata; limits to 20 unique positive media IDs and validates bounded HTTP(S) delivery URLs without credentials, fragments, controls, whitespace or backslashes.
- Empty arrays remain empty; unsupported/malformed legacy media stays unavailable. No fixture gallery, fake gradient photo, invented tags, metrics, reviews, verification or rating counts.
- `SpecialistProfile` composes the actual gallery and explicit unavailable-review text. `PortfolioGallery` renders real images/captions and a native modal with previous/next/close buttons, native keyboard containment, and opener restoration.
- Source self-review found that closing/reopening the dialog on every selected-image change could queue a native close event during navigation. Added a production modal-lifetime helper and RED→GREEN test: navigation keeps one modal open; final close restores only the original opener once. Browser behavior is still not claimed tested.

### Navigation, summary and truthful dashboards

- Header and MobileMenu use the same role-fixed account-link projection: both roles `/account`; specialists additionally `/pro/profile`; correct role dashboard remains available.
- BottomNav now links to real account/profile destinations, not fictional specialist opportunities. Existing brand/RTL/theme/font layout is retained; expanded menu content can scroll.
- Existing shared `AuthSummaryProvider` remains the only shared identity summary. Login success and successful account writes reload it. Added tests for authoritative renamed-summary broadcasts, clearing obsolete logout-error presentation after a successful new read, and denying summary reload while logout is pending.
- Local action gates prevent duplicate dispatch and discard results after component cancellation. Capability GETs and challenge GETs use abort cleanup. Owner DTO state is transient form data, not another auth store. No JWT, full-phone or identity persistence was added to local/session storage.
- Authenticated dashboards no longer present fake projects, lead purchases, wallet balances, unconditional verified badges or financial totals. They show real account/profile links and explicit not-connected sections. No financial flow was implemented.

## Stable HTTP contract usage — Task7D unchanged

No Task7D profile route handler, private gateway, request policy, session sealing/fencing, upload transport or profile DTO parser was rewritten.

| Browser route | Use in Task7E |
| --- | --- |
| `GET /api/account/me` | Explicit authoritative account reread and recovery admission |
| `POST /api/account/me` | Exact account fields or separate `{avatar_id}`; sync shared summary after success |
| `GET /api/profile/me` | Authoritative owner profile reread/recovery |
| `POST /api/profile/me` | Exact professional fields or separate `{avatar_id}` |
| `POST /api/profile/submit` | Exactly `{}`, explicit user action; never publish prediction |
| `POST /api/profile/gallery` | `media_id`, bounded caption, `kind:'image'`, current `expected_revision` |
| `DELETE /api/profile/gallery/media/[id]` | Positive media ID and JSON current `expected_revision`; no query revision |
| `GET /api/profile/media` | Actual safe capability DTO, including role purposes and decoder limits |
| `POST /api/profile/media` | Native FormData with exactly one `file` and `purpose`; no manual multipart boundary |
| `GET /api/auth/challenge` | Actual challenge presentation even when transient phone context is absent |
| `POST /api/auth/refresh` | Explicit recovery only after actual 401 `refresh_required`, singleflight, followed by safe GET |

All calls use fixed paths, same-origin credentials and no-store. Runtime browser DTO projection reuses the reviewed DTO validators through explicit camel/snake mappings. Unknown input authority fields reject before fetch.

### Upload/gallery truth and partial failure

- Disclosure and explicit acknowledgement precede enabled file selection/upload: normal delivery URLs are PUBLIC even while the professional profile is draft/pending; no private/identity documents.
- Picker uses actual capability MIME list and byte/dimension/pixel limits. One image per request; no video control or fake video support. WebP codec rejection has explicit actionable text, not a promise that a declared MIME must decode.
- Image preview object URLs are revoked on replacement/unmount. Pending state is indeterminate, not a fabricated percentage.
- Upload is a separate explicit action from avatar assignment/gallery attachment. A successful upload is retained as an asset with its real ID/URL; assignment failure does not automatically upload again or claim rollback. Copy directs the user to the freshly read connection state after uncertain failures.
- Mutations and upload dispatch are serialized by the owner action gate. No upload or mutation is automatically retried, including after refresh.
- 409 or `reloadRequired` rereads authoritative owner state once. A failed reread blocks further changes until an explicit reread succeeds. Gallery revision is never locally invented/incremented. Canonical storage unavailable means readonly existing valid images; no ACF migration.
- Detach removes only the gallery reference, not the public file. Uncertain upload outcomes stay locked against another upload until explicit user investigation/reload; a known 413/415/422 rejection can allow a different explicit file after state reread.
- Local validation failure remains 422 without claiming a write happened. Malformed successful response after a possible mutation is instead 503 `operation_uncertain` with reread required.

## Auth completion/recovery and the limited coordinator adaptation

- Verify reload always calls the real challenge GET. No redirect merely because in-memory phone context was lost. Actual server 5/6-digit length and simulation flag drive presentation. No own-code comparison, cookie decoding, full-phone reconstruction, tracking exposure or hint acceptance.
- If transient phone is absent, resend directs the user to reenter the number at login; existing challenge verification remains possible.
- New registration returns only an optional role-bounded `onboardingTo` presentation (`/account` or `/pro/profile`) after successful server verification. Existing accounts keep the role dashboard redirect. `is_new` is not exposed as permission authority, and selected role never overrides returned account role.
- `/auth/recover` accepts only the four fixed return targets `/account`, `/pro/profile`, `/dashboard`, `/pro`; external URLs, queries inside a target and arrays fall back to `/account`.
- Recovery first reads safe account/profile state. Healthy sessions do not rotate. Lost-session/configuration responses do not trigger refresh. Only actual 401 `refresh_required` admits one shared explicit refresh POST, then safe reread; a refresh epoch avoids another rotation for a delayed same-wave response. There is no loop and no mutation replay.
- Minimal reviewed-coordinator amendment, explicitly requiring independent review: added static safe-code mappings for upstream OTP rate/validation/consumed/missing errors and revoked/expired/invalid refresh credentials. 422 wrong code, 410 expiry and 429 rate meanings survive callbacks; provider/configuration failures remain safe 503. Added optional new-account presentation after verified server-role resolution.
- No changes to coordinator credential handling, generation fences, authenticatedOperation, logout cancellation, refresh finalization, cookie writing, ports or private transports. Tests exercise the actual coordinator callbacks, including lost-refresh versus provider-outage distinctions. No raw upstream message/status passthrough was introduced.

## Actual RED → GREEN evidence

All artifacts below are under `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/`.

| RED log | Observed RED | Covered by final GREEN |
| --- | --- | --- |
| `task-7e-red-owner.log` | 5 failed | Missing exact form parsers, route bounds, role nav, direct-read composition, error presentation |
| `task-7e-red-client.log` | 5 failed | Fixed browser submission paths, summary sync, no replay, upload/assignment separation, revision/error/lifetime behavior |
| `task-7e-red-auth.log` | 4 failed, 10 existing passed | Verify reload, minimal onboarding and safe callback status preservation |
| `task-7e-red-render.log` | 4 failed | Actual account/professional form SSR, removal of dashboard fixtures, real image rendering |
| `task-7e-red-public.log` | 1 failed, 7 passed | Actual normalized public media projection and strict URLs |
| `task-7e-red-public-composition.log` | 1 failed, 4 passed | SpecialistProfile actually composes gallery and unavailable reviews |
| `task-7e-red-media-ui.log` | 1 failed, 5 passed | Public-purpose disclosure before picker enablement, actual capabilities and codec/video text |
| `task-7e-red-recovery.log` | 1 failed, 5 passed | Failed mutation reread once without fabricated success/retry |
| `task-7e-red-dashboard-recovery.log` | 1 failed, 5 passed | Dashboard role/expiry/lost-session/provider distinctions |
| `task-7e-red-error-semantics.log` | 2 failed, 18 passed | Lost refresh is 401; local validation is not ambiguous mutation success |
| `task-7e-red-malformed-success.log` | 1 failed, 7 passed | Post-write malformed DTO remains uncertain/reload-required |
| `task-7e-red-summary.log` | 2 failed, 3 passed | Shared renamed-summary recovery and logout-pending read denial |
| `task-7e-red-upload-presentation.log` | 1 failed, 6 passed | Known codec rejection versus uncertain upload; specific incomplete-profile text |
| `task-7e-red-motion.log` | 1 failed | Existing Button spring preserved, reduced-motion feedback becomes zero-duration/no scale |
| `task-7e-red-refresh-admission.log` | 2 failed, 7 passed | Recovery cannot refresh a healthy/lost session; initial read then one refresh and reread |
| `task-7e-red-dialog-lifetime.log` | 1 failed | One native modal lifetime across selections, original opener restored once |

Initial missing production modules had empty export/component stubs so failures were actual missing-behavior assertions, not unresolved-import syntax errors. Form/client tests call actual production helpers. Render tests use installed React/ReactDOM SSR for actual production forms, dashboards, public profile, gallery and disclosure UI; they inspect rendered output, not source grep. The workspace test loader uses the existing installed TypeScript compiler to transpile TSX and resolve existing aliases; no new test dependency.

One type-only onboarding fixture initially used null where the exact verify-user contract requires a string; corrected the fixture without weakening production contracts or assertions. An ESLint invocation initially included a nonexistent `.tsx` glob for the `.ts` summary store; corrected invocation and final manifest-driven lint passed. These are not claimed product regressions.

## Final verification

1. **Focused: 56/56 PASS**, exit 0, `task-7e-green-focused.log`. Actual command is recorded in that log; ten files include owner helpers/client, auth completion/UI/coordinator, public adapter, real component SSR, shared summary, button motion and dialog lifetime.
2. **Full discovered Node: 36 files, 262/262 PASS**, exit 0, no failed/cancelled/skipped/todo tests. `task-7e-full-node.log` records the full sorted command and discovery count. Compared with Task7D's 230 tests, 32 additional cases are now passing.
3. **`./node_modules/.bin/tsc --noEmit`: exit 0**, `task-7e-tsc.log`.
4. **All 39 delta source/test files scoped ESLint `--max-warnings=0`: exit 0**, no diagnostics, `task-7e-eslint.log`. CSS is not passed to ESLint; all changed TS/TSX files, including the shared Button and coordinator tests, are included.
5. **Next 16.3 Webpack build: exit 0**, `task-7e-webpack.log`. Actual route table includes dynamic `/account`, `/pro/profile`, `/auth/recover`, both dashboards and all unchanged BFF handlers. Build command:

   ```sh
   NODE_OPTIONS="--require=$PWD/.superpowers/sdd/staged-inventing-karp/task-7d-offline-build.cjs" NEXT_TELEMETRY_DISABLED=1 ./node_modules/.bin/next build --webpack
   ```

   Reused the existing verification-only preload that denies fetch, HTTP/HTTPS, socket connections and DNS before dispatch. No network-guard violation appeared in the successful final build. No server was launched. Next prints the existing env-file filename normally; no secret values were inspected or modified.
6. **`git diff --check`: exit 0**, plus all 39 source/test files checked with no-index whitespace checks and no diagnostics, `task-7e-diff-check.log`.
7. Final source self-review completed against the brief, direct-page composition, fixed client paths, handler response contracts, partial-upload behavior, refresh admission, coordinator amendment and public media boundary. This is author self-review, not the controller's independent security/spec review.

Existing macOS certificate trust-copy startup diagnostics were present in Node/build output where emitted; they were not hidden or claimed absent. Passing exit codes/counts above are the observed final results.

## Browser verification — BLOCKED / NOT RUN

No browser GET, screenshot, DOM/style measurement, mounted keyboard test, viewport test or light/dark visual test was performed. No OTP/file POST or live authenticated test was performed.

A safe preview would require an existing explicitly safe launch entry with outbound application networking blocked. Existing launch profiles could issue prohibited WordPress requests on their initial page load. A single attempt to prepare a temporary native-preview entry failed at the sandbox boundary:

```text
PermissionError: [Errno 1] Operation not permitted: '.claude/launch.json'
```

The original file is byte-identical to the captured copy. No retry through another tool/file, permission change, parent delegation, alternative server launch, Bash server, or unsafe existing launch configuration was used. No preview server or user process was started/stopped. This boundary is not a build failure and is not bypassed.

Consequently, responsive classes, RTL/theme tokens, input labels, focus styles, reduced-motion policies, native dialog mechanics and live state composition are source/SSR-tested only. **320px/tablet/desktop/ultrawide, light/dark, focus order/restoration, touch/keyboard, real image loading and object-URL cleanup still require browser verification.** No screenshots or visual acceptance evidence is claimed.

## Rulings and remaining concerns / activation

1. Existing approved design and current workspace were used directly; no worktree/commit/design restart. Cost: controller reviews the exact snapshot delta rather than a clean committed branch.
2. Backend validators are authoritative, including no-newline plain text, exact IDs and optional null clears. Cost: multiline biographies need a separately approved backend contract change.
3. Missing taxonomy/capability data disables affected editing instead of inventing options or promising decoder support. Cost: operator must restore data/configuration and explicitly reload the page.
4. Unknown/partial mutation outcomes reread once and never replay. Uncertain uploads remain blocked against duplicate creation. Cost: explicit operator/user investigation may be necessary; rollback/file deletion is not promised.
5. Safe OTP/refresh error-code mappings and optional role-bounded onboarding presentation were the only coordinator amendment. Cost: those exact changes require the upcoming independent security/spec review; no prior Task7D security PASS is claimed to automatically cover them.
6. Browser verification remains BLOCKED at the denied launch configuration boundary. Cost: visual/mounted interaction acceptance remains unproven; no workaround was attempted.
7. No live activation: same backend ID after repeated login, both-role account persistence, professional save/review/publication, real taxonomy values, actual media decoder/storage behavior (including WebP), assignment partial failure, gallery revision contention, public visibility, owner negatives, cookie refresh/logout races and CSRF across deployment origins remain controller/operator tests after independent review.
8. Task7D's process-local shared-coordination/deployment limitation remains unchanged. No distributed coordination, private media delivery, profile migration, financial service, payment, geo import or production-completion claim.

**Handoff:** independently review the stable snapshot diff and limited coordinator changes, then perform separately authorized operator local tests and safe browser acceptance. No further activation is performed by this implementation session.

## Exact source/test file list

All entries below are absolute paths in the final 39-file snapshot delta; report/evidence files themselves are separate.

### Modified existing files

- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/app/dashboard/page.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/app/globals.css`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/app/pro/page.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/blocks/PortfolioGallery.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/layout/BottomNav.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/layout/Header.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/layout/MobileMenu.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/layout/auth-summary-store.test.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/layout/auth-summary-store.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/sections/ClientDashboard.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/sections/ProDashboard.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/sections/SpecialistProfile.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/sections/auth/LoginForm.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/sections/auth/OtpForm.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/ui/Button.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/lib/auth-ui.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/lib/contracts/specialists.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/lib/specialist-adapters.test.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/lib/specialist-adapters.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/auth/auth-coordinator.test.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/auth/auth-coordinator.ts`

### New files

- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/app/account/page.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/app/auth/recover/page.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/app/pro/profile/page.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/sections/owner/MediaUpload.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/sections/owner/OwnerEditor.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/sections/owner/OwnerForms.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/sections/owner/OwnerPage.server.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/sections/owner/SessionRecovery.tsx`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/sections/owner/owner-render.test.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/lib/auth-completion.test.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/lib/owner-client.test.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/lib/owner-client.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/lib/owner-ui.test.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/lib/owner-ui.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/lib/portfolio-dialog.test.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/lib/portfolio-dialog.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/lib/tap-feedback.test.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/lib/tap-feedback.ts`


## Fix round 1 — preserve the existing recovery lock (latest handoff)

**The single reviewer Important finding is fixed in source. Latest verification supersedes the earlier 56/262 counts: 57/57 focused and 263/263 full Node tests PASS. Source status remains DONE_WITH_CONCERNS because browser verification is NOT RUN and same-reviewer re-review/operator integration acceptance remain pending.**

### Verified failure and exact fix

The reported sequence was reproduced through the real production browser client, DTO projection and `settleOwnerAction`, then actual `ProfessionalForm` SSR:

1. A profile mutation returns 503 `operation_uncertain` with `reloadRequired:true`.
2. Its automatic authoritative GET fails; recovery lock becomes true and the rendered fieldset is disabled.
3. Explicit authoritative GET also fails without `reloadRequired` and without returned owner state.
4. Before this fix, `reloadFailed:false` replaced the existing lock and enabled stale editing. RED failed exactly at `failed explicit GET must preserve the existing recovery lock` (`false !== true`).
5. After this fix, both failures preserve the lock; only a later successful explicit GET applies the returned title/revision and unlocks the rendered fieldset. Exact recorded dispatch sequence is one POST then three GETs: no retry of the mutation.

Production changes are deliberately limited:

- `settleOwnerAction` accepts the existing `blockedBefore` state. An unsuccessful response with no new state preserves it; a failed automatic reread still locks. A successful authoritative reread can return actual state and allow recovery.
- `OwnerEditor` passes the current lock to that production helper in both normal and upload paths. Only the explicit authoritative-read action is admitted while locked and only its success explicitly clears the lock. Other mutation success no longer blindly clears an existing lock; mutation/upload handlers also refuse dispatch while locked.
- The existing component regression test uses that exact production helper/state parameter and actual API client plus rendered production form controls. No unused test-only production helper, source grep, new auth store, backend/security expansion or browser test substitute.

### Baseline, scope and review package

- Fresh preserved fix baseline: `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7e-fix-1-before.snapshot/`. Original Task7E snapshot, original review diff, prior logs and user/controller work remain untouched.
- Exactly three source/test files changed from this fresh baseline; no additions/deletions, no auth/backend/Task7D changes, and all other snapshotted source/tests and package/config files are byte-identical:
  - `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/sections/owner/OwnerEditor.tsx`
  - `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/lib/owner-client.ts`
  - `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/components/sections/owner/owner-render.test.ts`
- This report appendix is the only additional existing workspace report change.
- Complete fix diff, including all three source/test files and this report appendix: `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/review-task-7e-fix-1.diff`.
- Exact fix file manifest: `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7e-fix-1-delta.json`.
- Current fix source/report fingerprints: `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7e-fix-1-sha256.json`. Earlier source fingerprints remain historical original-implementation evidence, not rewritten.

### Exact RED → GREEN and verification

All log names below are in `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/`.

- **RED** `task-7e-fix-1-red.log`: actual `owner-render.test.ts` run, 1 failed / 6 passed; assertion is the lock loss after the failed explicit GET, not an import/type/syntax failure.
- **Regression GREEN** `task-7e-fix-1-green-regression.log`: `owner-render.test.ts` plus `owner-client.test.ts`, **16/16 PASS**, exit 0. Command: `node --import ./.superpowers/sdd/staged-inventing-karp/task-7e-test-loader.mjs --test src/components/sections/owner/owner-render.test.ts src/lib/owner-client.test.ts`.
- **Focused** `task-7e-fix-1-green-focused.log`: **57/57 PASS**, exit 0; all ten Task7E focused files. Complete command is recorded in the log.
- **Full discovered Node** `task-7e-fix-1-full-node.log`: 36 files, **263/263 PASS**, exit 0, no failed/cancelled/skipped/todo tests. Full sorted discovery/command is recorded in the log.
- **TypeScript** `task-7e-fix-1-tsc.log`: `./node_modules/.bin/tsc --noEmit`, exit 0.
- **Scoped ESLint** `task-7e-fix-1-eslint.log`: all three changed TS/TSX files with `--max-warnings=0`, exit 0, no diagnostics.
- **Offline Webpack** `task-7e-fix-1-webpack.log`: exit 0 using the unchanged Task7D network-denying preload and `next build --webpack`; no server launch, no live network/WordPress operation. Existing certificate startup diagnostics remain visible where emitted.
- **Whitespace and scope checks** `task-7e-fix-1-diff-check.log`: `git diff --check` exit 0, complete source/report delta also no-index checked with no whitespace diagnostics; exactly three changed source/test files confirmed against the fix snapshot.
- Source self-check confirms a failed GET cannot unlock, recovery GET remains available while controls are blocked, successful authoritative state is applied before unlocking, and other mutations/uploads are not replayed or admitted while locked. Same-reviewer re-review has not been claimed performed by this session.

### Remaining boundary

**Browser NOT RUN.** The prior `.claude/launch.json` denial is still respected. No retry, alternate file/tool/parent action, permission change, unsafe preview configuration or server launch was attempted in this round. No subagents, network, live WordPress/auth/OTP/uploads/SMS/DB, env/secrets/config/dependency changes or commits. All original operator activation and browser acceptance gaps remain unchanged.
