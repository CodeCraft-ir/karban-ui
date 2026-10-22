# Task9D — distinct Faraz / IranPayamak pattern driver

## Result and safety boundary

Implemented the approved integration correction in **local source and offline tests only**. The existing `faraz_ippanel` is an IPPanel Edge adapter; it is not the documented IranPayamak API that the operator independently demonstrated. New driver: **`faraz_iranpayamak`**. The old driver’s endpoint, Authorization header, E.164 request shape, strict positive-integer Edge outbox-ID response contract, option names/defaults and stored configuration remain unchanged. No stored key is migrated, copied or read by the new transport from the old namespace.

No network tool, provider request, actual SMS, browser/live-admin visit, settings submission, runtime activation, WordPress bootstrap, actual DB access, credential/installation-secret read, environment/configuration change, dependency installation, git mutation or subagent was used. No denied host was retried through another tool. The operator’s recipient and example OTP were not reproduced or persisted. Tests use standalone fictitious canaries and fake in-memory WP boundaries only.

The documented contract was supplied in the task from evidence obtained **before** the earlier network denial; it was not downloaded or independently re-fetched in this task:

- `https://docs.farazsms.com/service/post-ws-v1-sms-pattern`
- The supplied facts from its public `/download/openapi.json`.

This is **not** a claim of live acceptance, delivery, credential/account validity or verified real-SMS login with the new driver. Independent review and any actual operator-controlled send remain outstanding.

## Frozen source baseline

Captured before any functional changes:

`/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9d-before.snapshot`

- JSON source-only text plus per-file SHA-256, **225 files** across application source/tests, active-plugin includes/rest-api and the setup document/package manifest.
- Read-only mode `0444`; frozen snapshot SHA-256: `6c11dfe562938be5f9dcb1622a4fdc12e81541054ffde6ee7d416dcc0c139476`.
- No runtime configuration, `.env`, WordPress configuration, database, installed options or installation secrets were captured.
- Final baseline comparison: **4 captured files changed, 221 unchanged**. These are exactly three production PHP files and the existing setup document below. The new Task9D test, snapshot and this report are additional files.
- Existing Task9C test/source edits remain unchanged against this baseline; the existing Task9C report/snapshot were not edited. No old plugin copy was edited.
- Compare the external active-plugin files against the snapshot, not only the web repository’s git diff.

## Exact changed/new files

### Production — exactly three files

1. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/auth/class-sms-service.php`
   - Selected-driver readiness and dispatch for the independent provider.
   - Fixed IranPayamak transport and strict `ApiResultNumber` acceptance.
   - New provider in bounded Task9C diagnostics; undocumented vendor codes omitted on both write and read projection.
   - Explicit free-text rejection for the new driver.
2. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/admin/class-settings.php`
   - New driver allowlist entry and separate four-field validation.
3. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/admin/class-admin-panel.php`
   - Existing Settings API registration/sanitizer and masked-password renderer extended to the independent fields.
   - Clear Edge versus IranPayamak domain/driver labels.
   - Checked non-autoload storage also enforced for unchanged new fields.

No frontend, OTP manager, rate limiter, local policy gate, route or credential implementation changed.

### Tests/documentation/evidence

- New `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-9d-iranpayamak.test.php` — **13 tests**, real service, settings sanitizers, registered dedicated admin mode callback, real readiness/OTP manager/CAS behavior; fake HTTP/options/DB boundaries, no bootstrap.
- Updated `/Users/binam/project/پرهیزکاری/karban-uiux/web/docs/wordpress-integration/faraz-sms-setup.fa.md` — preserves prior evidence, adds the distinct new workflow, marks old Edge instructions as historical and separates source/offline results from unverified live SMS.
- New `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9d-before.snapshot`.
- New `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9d-report.md` (this file).

## Admin fields and operator handoff — not executed

Existing page: `nahan-settings`. Existing driver option: `nahan_sms_driver`; the operator must select/save **`faraz_iranpayamak`** themselves.

| Admin label | New WordPress option | Default and validation |
| --- | --- | --- |
| Faraz IranPayamak Api-Key — faraz_iranpayamak (api.iranpayamak.com/ws/v1/sms/pattern) | `nahan_sms_iranpayamak_apikey` | Blank; printable non-whitespace ASCII, 1–512 bytes |
| Faraz IranPayamak Pattern Code | `nahan_sms_iranpayamak_pattern_code` | Blank; printable non-whitespace ASCII, 1–128 bytes |
| Faraz IranPayamak line_number | `nahan_sms_iranpayamak_line_number` | Blank; exact ASCII digits-only national service line, leading zero retained; no E.164 conversion or guessed prefix |
| Faraz IranPayamak OTP Variable | `nahan_sms_iranpayamak_variable` | Blank; exact configured variable, bounded ASCII alphanumeric/underscore/hyphen, 1–64 bytes |

The new variable has **no implicit `code` default**. All four independent values must be valid before the selected provider is configured. The password’s HTML value is always empty; the old value is never returned to HTML. Exactly blank/missing key preserves the key for this namespace; the separate `_clear` checkbox deliberately clears it. Actual Settings API raw POST data is unslashed and validated **before WP’s trimmed argument can silently repair it**. Capability/nonce checks precede writes. Invalid values preserve the previous value and report a fixed validation error; no raw input is rendered in the error. First/changed/retained values are checked and persisted non-autoloading; storage failure does not claim success.

No new option is eagerly created and no existing credential is automatically reused. Saving settings does **not** arm, disarm or reset the existing policy. If a deployment is already armed, saving a newly configured selected provider leaves that policy armed; the operator must inspect/coordinate the current mode before making any login request. Task9B’s separate explicit confirmation, local/schema gates and independent Next opt-in remain in force. This task did not change any of them.

After independent review, the authorized operator privately supplies the four values and selects the new driver. Readiness is syntactic configuration-only and performs no HTTP. Any future send requires separate explicit operator approval and the normal login flow after normal cooldown; there is no send/test/debug button added here.

## New transport and response contract

- Fixed `POST https://api.iranpayamak.com/ws/v1/sms/pattern`.
- Raw `Api-Key`, JSON `Accept` and `Content-Type`; no Authorization/Bearer substitution.
- JSON strings: `code` (configured pattern), `recipient` (existing normalized national `09…` phone), `line_number` (exact configured national service line), `number_format: english`.
- `attributes` is always a JSON object, including numeric-looking variable names. Its dynamic configured variable receives the **existing WordPress-generated OTP**, never a fixed provider-test code.
- Existing input normalization and five-digit OTP validation occur before transport.
- Timeout **10 seconds**, redirects **0**, HTTP response limit **16384 bytes**, parser also rejects oversized responses, JSON decode depth **32**.
- Acceptance requires **HTTP201 + root status exactly string `success` + data a finite JSON number**. Boolean/string/null/array/object/nonfinite numbers do not qualify. There is deliberately **no positive/integer constraint**: zero, negative and noninteger finite numeric values are accepted according to the supplied schema.
- No dependency on Edge meta/outbox IDs. `messages` is ignored for every shape because its supplied schema is contradictory. No undocumented vendor-code extraction is invented.
- Acceptance is **`accepted_not_delivery`**, not a delivery receipt. Returned data is never returned to the caller, logged or stored in the diagnostic.
- No retries, failover, log/fixed-code fallback, fake success or free-text support was added. Unsupported generic pattern calls do not provide a second send path for this driver.

## Diagnostics and preserved invariants

The same single best-effort option `nahan_last_otp_send_diagnostic` now admits `faraz_iranpayamak`. Projection remains `manage_options`-only with fixed timestamp/provider/outcome, bounded HTTP status and safe transport class. For this driver, vendor_code is omitted even from a stored otherwise-valid record. There is no raw phone, OTP, API key, message, request/response body, header, data ID or identity in this diagnostic or its rendering.

HTTP other than 201 or root status `error` is categorized `provider_rejected`; HTTP201 with a missing/malformed/unexpected success contract is `invalid_response`; a valid acceptance is `accepted_not_delivery`. Transport and unexpected exceptions use the existing controlled categories and static public errors. False/throwing diagnostic storage cannot turn accepted transport into a retryable failure or trigger another send. A missing/stale record therefore remains possible; its timestamp must be compared to the actual approved attempt.

No failed-challenge invalidation, throttle, expiry, max-attempt, CAS consumption, single-use verification or trusted-mode gate was relaxed. New-driver tests exercise exact failed-challenge removal while retaining an unrelated row and cooldown; successful generated OTP hashes and single-use consumption are checked. Existing Task9B/9C and other suites retain broader invariant coverage.

## TDD and verification evidence

Observed sequence:

1. Initial new suite against unchanged production: **8 tests, 8 expected failures**, covering absent readiness/driver, request/acceptance, new settings, labels and manager integration.
2. Implemented the bounded correction: **8/8 passed**.
3. Added explicit unchanged-new-field non-autoload and undocumented vendor projection regressions: **10 tests, 2 expected failures**.
4. Hardened exactly those boundaries: **10/10 passed**.
5. Extended integration coverage for selected-driver registered mode action/schema/capability/nonce/confirmation gates, CAS consume, raw first-save/direct-call validation and throwing diagnostic storage: final **13/13 passed**.

Final verification:

| Check | Observed result |
| --- | --- |
| All existing 14 standalone PHP suites + new suite | **15/15 suites passed**, using the active plugin path argument where required |
| New Task9D suite | **13 passed, 0 failures** |
| Existing Task9A / 9B / 9C | Passed unchanged |
| PHP syntax for active-plugin includes/rest-api + WordPress tests | **64 files passed** |
| Full Node suite with existing Task9C TSX/alias loader and inherited fail-before-network guard | **303 passed, 0 failed**, 270 top-level subtests |
| TypeScript `--noEmit --incremental false` | **Passed** |
| Scoped ESLint on existing Task9C auth integration/test files | **Passed**; Task9D changes no TS/TSX |
| Full repository ESLint | **Not green: 4 existing errors, 8 warnings**; not repaired outside scope |
| Isolated Next16.3.0 Webpack production build | **Passed**, compilation, TypeScript, static generation and traces completed |
| `git diff --check` and baseline-added-line whitespace audit | **Passed**, zero new whitespace errors |
| Final snapshot scope | **3 production PHP files + setup doc changed; 221/225 captured files unchanged** |

Known full-lint failures are all in `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7d-offline-build.cjs`: `@next/next/no-assign-module-variable` and three `@typescript-eslint/no-require-imports` errors. The eight existing unused-variable/image warnings remain. Some Node/static checks also emitted the local system-certificate trust-store initialization warning (`failed to copy trust settings of system certificate`); exit statuses and test counts above were still successful. This is not a provider/network result.

Tooling corrections, not product failures: the first all-PHP invocation omitted the required plugin CLI argument in five older suites; rerunning all fifteen with that argument passed. The first isolated-copy preparation attempted to copy a nonexistent `package-lock.json`; it stopped before building. The corrected explicit existing-input copy then built successfully. An intermediate test-fixture assembly command stopped on a missing local substring before writing; corrected assembly passed. The initial baseline inventory encountered a binary asset during UTF-8 decoding before any snapshot was written; the final source-extension-only baseline was successfully frozen before tests or implementation changes.

Build isolation: source/public and explicit nonsecret build inputs only, existing node_modules linked, scrubbed child environment and isolated HOME, telemetry disabled, inherited guard blocks fetch/HTTP/DNS/sockets before I/O. No `.env`, wp-config, runtime DB/data or active `.next` was copied or cleared; no server was started. The source web `.next` was not a build target.

Scratch evidence is under `$TMPDIR`: `task9d-red.log`, `task9d-green.log`, `task9d-red-hardening.log`, `task9d-green-hardening.log`, `task9d-expanded.log`, `task9d-final-focused.log`, per-suite `task9d-*.test.php.log`, `task9d-php-syntax.log`, `task9d-all-node.log`, `task9d-tsc.log`, `task9d-scoped-lint.log`, `task9d-full-lint.log`, `task9d-build.log` and `task9d-build-location`. Reused offline tools: `$TMPDIR/task9c-tools/register.mjs` and `offline.cjs`.

## Remaining gaps / independent review

- No live request, live admin save, account/pattern/line validation or end-to-end SMS receipt/login has been performed for the new driver.
- The response `messages` schema and any vendor error-code shape remain unresolved in the supplied evidence. Neither is needed for the documented success contract; both are intentionally ignored, not guessed.
- The provided successful operator send demonstrates that the IranPayamak contract is relevant, not that historical Edge failures or future delivery are proven repaired.
- Review must use the frozen baseline for the external plugin changes and examine the new standalone test. No independent reviewer/subagent was run because this task explicitly forbids subagents.
- Any future actual send is a separate operator action, not part of this completed offline source correction. Do not automatically resend after an uncertain result or bypass throttle to test it.
