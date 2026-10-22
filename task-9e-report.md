# Task9E — bounded IranPayamak HTTP200 compatibility correction

## Evidence and limits

Task9D’s distinct `faraz_iranpayamak` integration passed its independent 13-test review with no reported Important/Critical findings. Subsequently, the human operator reported **SMS received after privately saving the correct driver**, while the UI still reported an error. The controller relayed a read-only admin observation: provider `faraz_iranpayamak`, timestamp `2026-10-22T04:47:21Z`, outcome `provider_rejected`, HTTP **200**.

That observation establishes the actual HTTP status, **not the raw response body**. The body was not available, and receipt of SMS does not prove the root `status` or type/value of `data`. The exact-201 gate necessarily rejected the observed HTTP200 regardless of its body. This task corrects that known status mismatch, without inferring an unobserved schema or claiming that all possible causes of the UI error are repaired.

Official evidence supplied for Task9D documents HTTP201. The bounded compatibility rule now admits the **known observed 200 OR documented 201**, with all existing strict body checks retained. No network/document fetch, HTTP/provider/SMS request, browser/admin visit, settings save, actual DB access, WordPress bootstrap, secret/key/recipient read, configuration/environment change, dependency installation, git mutation or subagent occurred in Task9E. No denied host was retried. The operator’s recipient/key/example OTP was not reproduced or persisted. Only fictitious test canaries were used.

**Live end-to-end login on the corrected version remains pending.** Acceptance is not delivery confirmation. No new response logging or debug endpoint was added.

## Frozen baseline and exact scope

Read-only source/text and per-file SHA-256 baseline captured **before** Task9E changes:

`/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9e-before.snapshot`

- **180 files**, mode `0444`.
- SHA-256: `6bc6c3ed548226fdc12d41d045516768b0667e707a0721c8e920c3bf790292a0`.
- Includes the relevant active-plugin source, application TS/TSX, all existing WordPress tests, setup guide and previous Task9D report/snapshot. No runtime options, environment secrets or database material.
- Final scope comparison: **3 captured files changed; 177 unchanged**. New focused test/report/snapshot are additions.

### One production file changed

`/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/auth/class-sms-service.php`

Only the IranPayamak acceptance-status guard and diagnostic classification changed, with explanatory comments:

- Accepted HTTP status is exactly `200` or `201`.
- Root status must still be exactly string `success`.
- Root data must still be an actual finite JSON number. Zero, negative and noninteger values remain valid; bool/string/null/array/object/nonfinite values remain invalid.
- Any other 2xx remains a public safe failure and records `invalid_response`, rather than asserting provider rejection.
- Non-2xx or exact root status `error` still records `provider_rejected`.

The request endpoint/header/body, national-number normalization, credentials, settings/readiness, timeouts/redirect/body limit, ignored `messages`, no-vendor-code rule and Edge implementation were not changed. No frontend, OTP-manager, local mode, rate-limit, schema or CAS implementation changed.

### Other changed/new files

- Changed `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-9d-iranpayamak.test.php`: intentionally removed HTTP200 from the original 201-only rejection fixture and added the runtime-evidence reason. It still rejects unrecognized status codes. Focused Task9E tests explicitly cover valid 200 and all negative cases; the old expectation was not silently deleted to make a test pass.
- New `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-9e-http-status.test.php`: four focused offline tests using the real service and OTP manager, with fake in-memory WordPress/HTTP boundaries.
- Changed `/Users/binam/project/پرهیزکاری/karban-uiux/web/docs/wordpress-integration/faraz-sms-setup.fa.md`: official201 versus observed200 distinction, unknown historical body, strict new acceptance gate and pending live login.
- New `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9e-before.snapshot`.
- New `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9e-report.md` (this file).

The previous Task9D report/snapshot and both active admin PHP files remain byte-for-byte unchanged from the Task9E baseline. The old plugin copy was not touched.

## TDD and safety regressions

Observed RED before production changes: **4 tests, 4 failures** — valid200 rejected; malformed200 mislabeled as provider rejection; unexpected2xx mislabeled; accepted200 could not survive the strict status gate during diagnostic-storage failure.

After the minimal fix: **4 tests, 0 failures**. Focused coverage includes:

1. HTTP200 and HTTP201 each accept exact success plus finite JSON numbers, including zero, negative, fractional and exponent notation; one request only and no sensitive diagnostic/data IDs.
2. HTTP200/201 alone, empty/malformed JSON, missing root fields, boolean/uppercase status, status error, bool/string/null/object/list/nonfinite data and oversized bodies all fail closed. The status-error versus invalid-response classification is asserted.
3. Other2xx (`202`, `204`, `206`, `299`) never qualify, even with an otherwise-valid body; they record `invalid_response`. Explicit root status error still records rejection. Non2xx rejection remains unchanged.
4. Accepted200 survives false/throwing diagnostic writes without resend. Normal generated-OTP challenge/verification and single-use CAS remain functional. A malformed200 response invalidates the failed challenge and retains cooldown; subsequent request is throttled, not resent.

Task9D’s 13 tests, plus existing Task9A/B/C and all other suites, continue covering secure raw-before-trim settings, secret preserve/clear, capability/nonce, non-autoload storage, noHTTP readiness/admin render, exact request contract, failed-challenge isolation, transport errors and mode gates. None of these rules was relaxed.

## Verification

- **16/16 standalone PHP suites passed**: all prior fifteen plus the new focused suite. Each receives the active-plugin path argument where required.
- Focused Task9E suite: **4/4 passed**. Existing Task9D suite: **13/13 passed**.
- PHP syntax: **65 files passed**, active-plugin includes/rest-api plus WordPress tests.
- Full Node baseline: **303 passed, 0 failed**, 270 top-level subtests, using existing Task9C TSX/alias loader and inherited fail-before-network guard.
- TypeScript `--noEmit --incremental false`: **passed**.
- Scoped ESLint on existing Task9C integration/test files: **passed**; no frontend file changed.
- Full repository ESLint: **not green — 4 existing errors / 8 warnings**. All four errors remain in `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7d-offline-build.cjs` (`@next/next/no-assign-module-variable` and three `@typescript-eslint/no-require-imports` errors). Unrelated helpers/warnings were not changed.
- Isolated offline Next16.3.0 Webpack production build: **passed**, compilation, TypeScript, static generation and traces completed.
- Some Node/static commands emitted the existing local system-certificate trust-store initialization warning (`failed to copy trust settings of system certificate`). This is not a provider response or evidence of a network request; successful exits/test totals above remain as recorded.
- `git diff --check`: **passed**. Source baseline comparison confirms only the one production file above changed.

The production build is performed only in a new `$TMPDIR` source/public copy, with explicit nonsecret inputs, linked installed node_modules, isolated HOME, scrubbed child environment, telemetry disabled and inherited offline guards blocking fetch/HTTP/DNS/socket I/O. No `.env`, wp-config, runtime DB/data or active `.next` is copied or cleared, and no server is started.

Scratch evidence under `$TMPDIR`: `task9e-red.log`, `task9e-green.log`, per-suite `task9e-*.test.php.log`, `task9e-php-syntax.log`, `task9e-all-node.log`, `task9e-tsc.log`, `task9e-scoped-lint.log`, `task9e-full-lint.log`, `task9e-build.log` and `task9e-build-location`. Existing guards/loader were reused, not installed or altered.

## Remaining review / operator boundary

This correction fixes the known overly narrow HTTP status gate. The historical raw body is still unknown; if a future actual body does not match the documented success/data contract, the safe UI failure remains intentional. No schema beyond the supplied official contract has been inferred. No further logging is needed to implement this known gate fix.

Any live recheck is a separate, explicitly approved operator action after normal cooldown, through the normal login flow with their own privately controlled recipient. Do not automatically retry, bypass throttle or claim the historical SMS receipt proves successful login on the corrected source. The implementation itself did not send any SMS or alter runtime state.
