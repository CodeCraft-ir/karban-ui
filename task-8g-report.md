# Task8G — mounted gallery lifecycle investigation

## Outcome

**Mounted offline regression coverage added. Reported product defect NOT reproduced; product fix NOT IMPLEMENTED. Root cause remains unproved.** No production file was changed. This does not mean the reported live stale-gallery symptom is resolved.

The approved brief was read first. The actual `OwnerEditor`, `AuthSummaryProvider`, summary store, owner client, forms, media components and Button/GSAP hooks were exercised without replacing their hooks, state setters, action gates or provider. No helper/SSR/source-text assertion is offered as the detach-behavior proof.

## What was added

- `src/components/sections/owner/owner-mounted.test.ts`: 15 serial mounted scenario subtests, plus their parent test (Node reports 16 tests).
- `task-8g-before.snapshot`: fresh pre-edit originals for 162 frontend source/package/config files, including pre-existing untracked workspace components/tests. Final comparison found **zero baseline files changed**. In particular, user-installed jsdom/package changes and existing Task8 UI edits remain byte-for-byte intact.
- `review-task-8g.diff`: only the new mounted test file; intentionally excludes snapshot/report, previous UI edits and unrelated parallel SMS artifacts. Reverse-apply check passed without applying/reverting anything.

## Actual lifecycle evidence

All scenarios below pass against the unchanged production source:

1. Deferred actual gallery DELETE in ordinary mode and StrictMode: existing image remains while pending, duplicate disabled click dispatches no second DELETE, body contains `expected_revision:1`, and response `{gallery:{gallery:[],galleryRevision:2,galleryAvailable:true,status:'draft'}}` removes the figure immediately. Empty text and the actual success notice appear, `aria-busy` becomes false, and draft status/stable public slug remain unchanged. No profile reread, manual reload or remount occurs.
2. Two actual summary consumers share the real provider. A new summary load during DELETE retains the account and same editor DOM. DELETE completion remains visible before and after summary load completes.
3. Summary read failure during DELETE clears the account and hides/replaces the editor DOM via its access gate. Both timings pass: DELETE completes while hidden, or only after summary recovery. Recovery renders the accepted empty gallery and success notice. The former owner root is disconnected and a different root is created, **without losing OwnerEditor state**. This directly demonstrates why DOM replacement alone does not establish React component unmount.
4. Two overlapping provider loads resolved out of order: a stale failed response cannot replace the newer authenticated summary or discard accepted gallery state.
5. Explicit real OwnerEditor unmount/remount while DELETE is deferred: the old completion does not notify the new instance; fresh authoritative initial props are respected. StrictMode effect setup/cleanup runs normally.
6. Explicit stale-input negative control: after a successful detach, a genuine remount supplied deliberately stale original initial props displays the old image and no prior notice. An explicit authoritative reload removes it. This demonstrates a boundary of remount input, **not a failing product requirement or proof that the live server supplied stale props**. No change was made to automatically reread/replay on mount.
7. Malformed successful gallery DTO is rejected. Before authoritative reread resolves the image remains and editor stays busy; reread applies authoritative empty state, displays an error rather than false mutation success, and performs no mutation replay.
8. DELETE 409 triggers reread. Failed recovery read leaves controls locked; a further failed explicit read does not unlock; successful explicit read restores authoritative state and enables editing. No automatic mutation replay occurs.
9. 403 forbidden and 401 refresh-required do not accept a gallery result or replay a write. The latter exposes the real explicit session-recovery link.
10. Successful and failed logout during deferred DELETE invalidate both the old owner completion and an older summary load. No private gallery or success notice returns. Explicit account invalidation also rejects the old completion after later summary recovery.

The explicit-invalidation scenario asserts cancellation, not a new requirement to unlock that same cancelled editor. Existing cancellation/pending behavior was left unchanged rather than weakening security to display a stale response.

## Source-flow findings and limits

- `OwnerEditor` accepts parsed detach gallery state with a functional profile merge. Successful gallery detach does not refresh the summary or call router refresh.
- The summary refresh callback is stable; ordinary summary loading retains account identity. A failed summary read sets account null but is not logout. OwnerEditor can return its access-gate markup and later return editor markup without its own action gate being cancelled.
- Actual unmount and logout/invalidation cancel the local action generation. Those checks were preserved.
- `OwnerPage.server.tsx` obtains initial input from `loadOwnerScreen` and supplies it to OwnerEditor. This source inspection does not establish what props a particular live replacement received.
- The prior selector was `main [aria-busy]` (descendant DIV), not `main[aria-busy]`. There is no demonstrated runtime/source-tag mismatch.
- The mounted tests do not reproduce Next dev HMR, browser hydration, route replacement, or an actual stale server render. No evidence here proves provision-cache, HMR or source-DOM replacement as the live root cause. No dev-cache/config changes or speculative optimistic updates were made.

## Test harness and safety

Uses installed React 19/ReactDOM `createRoot` and React `act`, jsdom 30.1.3, and the existing Task7E TSX/alias loader. One serial suite owns the DOM; globals are installed before dynamic component imports. Next Link also needs the browser `self` global. The only missing browser primitive supplied is `matchMedia` (reduced motion matches); actual GSAP/useGSAP and application effects still run. JSDOM's external resource loading remains disabled by default. The image is an inert localhost fixture URL, not an actual file.

Both global and window fetch point to an in-memory strict router. Only enumerated relative API routes/methods are allowed; unknown routes, absolute/external URLs and fetch attempts outside a harness throw and are recorded as assertion failures. There is no native-fetch fallback. Synthetic IDs 7001/7002/7003 and null login phone are used. No JWT, OTP, SMS, upload, real account/profile write, WordPress or database access is involved. Each harness unmounts its actual React root, settles pending fake requests, verifies capability AbortSignals were aborted and removes its DOM. Final cleanup closes jsdom and restores every replaced global descriptor. No testing dependencies were installed.

### Development failures are not product RED

- Initial harness run failed because Next Link's idle callback expected `self`, which the harness had not installed. This was corrected in the test only.
- A second run passed the first nine scenarios before its process was SIGKILLed during the recovery-lock scenario. The test contained an invalid assertion expecting no alert element after recovery even though ProfessionalForm always renders an empty validation-alert paragraph. The assertion was corrected to test absence of nonempty error alerts. The subsequent mounted run passed all scenarios.
- Neither harness issue establishes a real detach-behavior failure. There is **no demonstrated product RED→GREEN cycle**, and no claim of a product bug fixed.

## Verification (fresh final source)

All Node tests use the established loader:

```sh
node --import ./.superpowers/sdd/staged-inventing-karp/task-7e-test-loader.mjs --test src/components/sections/owner/owner-mounted.test.ts src/components/sections/owner/owner-render.test.ts src/components/sections/owner/workspace-render.test.ts src/components/sections/owner/workspace-presentation.test.ts src/lib/owner-client.test.ts src/lib/owner-ui.test.ts src/components/layout/auth-summary-store.test.ts
```

**Focused: 57 passed, 0 failed, 0 skipped/cancelled/todo.** Includes actual mounted scenarios plus existing owner render/client/UI and summary-store tests.

```sh
node --import ./.superpowers/sdd/staged-inventing-karp/task-7e-test-loader.mjs --test $(find src -name '*.test.ts' -print | sort)
```

**Full source Node suite: 292 passed, 0 failed, 0 skipped/cancelled/todo; 259 top-level entries.** Fifteen new scenario subtests plus their parent account for the increase from the previous 276 tests.

- `./node_modules/.bin/tsc --noEmit --incremental false`: exit 0.
- `./node_modules/.bin/eslint src/components/sections/owner/owner-mounted.test.ts`: exit 0, no diagnostics. No claim of full-repository lint.
- Isolated offline `next build --webpack`: exit 0; compiled successfully, TypeScript completed, 8/8 static pages generated. Installed dependencies were symlinked into a fresh temporary source/public copy; no env/credentials were copied. A temporary Node preload blocks fetch and HTTP(S) request/get; the child process received a minimal environment with telemetry disabled. No network fallback or server launch. The active development `.next` directory was untouched.
- `git diff --check`: exit 0; new-file/report whitespace checked separately.
- Baseline comparison: 162 files, zero changed.
- `git apply --reverse --check review-task-8g.diff`: exit 0.

Evidence logs are in `/tmp/claude-501/task-8g-evidence.xkmAgh` (created through `$TMPDIR`); isolated build is `/tmp/claude-501/task-8g-build-ZpxhC9`. Logs: `mounted-initial.log`, `mounted-second.log`, `mounted-third.log`, `focused.log`, `full-node.log`, `tsc.log`, `lint.log`, `webpack.log`, `build-location.log`, `snapshot-diff.log`, `diff-check.log`. The macOS `failed to copy trust settings of system certificate-25291` diagnostics appeared during Node testing; final test commands exited 0 and had no failed tests.

## Handoff / remaining work

Independent controller review and separately authorized real-browser retest remain necessary. To resolve the live symptom, capture actual OwnerEditor mount identity/action lifetime and authoritative initial/returned gallery revision through the replacement, rather than inferring unmount from a disconnected DOM node. That observation is a proposed next diagnostic, not something performed here. No live browser/server/profile state was touched in this task. No backend/SMS/config/dependency/permission changes, subagents or commits were made.
