# Task9G — evidenced numeric data.id response contract

## Evidence and bounded result

Implemented a local-source/offline response-contract correction, ready for independent review. The controller relayed fresh read-only admin evidence at 17:09: timestamp `2026-10-22T13:38:42Z`, provider `faraz_iranpayamak`, outcome `invalid_response`, HTTP200, `response_root=object`, `response_status=success`, `response_data_type=object`, `response_messages_type=missing`, `response_id_type=number`. The operator again reported SMS received and the specific safe `sms_provider_error` UI error.

The existing supplied official prose mentions `data.id`, while the supplied OpenAPI schema described numeric data. Together, this establishes the structural mismatch: the prior predicate required data itself to be numeric, but the observed response has numeric id inside data. **The actual ID value was not read or inferred.** The raw body remains unavailable. The safe shape shows numeric type, not finiteness or a specific value. This correction still requires actual finite numbers.

Acceptance now supports exactly two known contracts, both requiring HTTP200 or201 and root status exactly string `success`:

1. Existing documented finite JSON-number `data`.
2. Plain decoded JSON object (`stdClass`) `data` with known `id` property holding an actual finite JSON number.

No string/boolean coercion, missing/null/list/object/nested-ID acceptance, arbitrary2xx acceptance or acceptance based on diagnostic facts was added. Zero, negative and fractional finite values remain permitted; there is no supplied positive/integer requirement. Extra object fields and messages are ignored, never logged/stored/exposed. Accepted remains `accepted_not_delivery`.

This is **not live end-to-end verification** of the corrected source. Independent review and a separately approved operator-controlled normal login recheck remain pending.

## Boundary

No network/SMS/provider/document fetch, user recipient/key/ID-value read, actual DB access, WordPress bootstrap, admin save, runtime/env/config modification, dependency install, git mutation or subagent was performed. No denied host was retried. The private env—including the controller-aligned APP_ORIGIN—was not opened or edited. The existing port3000 server was not touched, killed or restarted. No active `.next` build output was changed. Tests use fictitious standalone canaries only.

## Frozen baseline / exact scope

Snapshot captured before Task9G changes:

`/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9g-before.snapshot`

- **183 source/text files**, mode `0444`, per-file hashes/text.
- SHA256 `32a31bb4053b7d63228f9cc692ec5764667e7c5bcbbbcf2ca7002d4e4200a9c6`.
- Source-only: no runtime options, DB, wp-config, private environment or installation secrets.
- Final baseline comparison: **2 captured files changed, 181 unchanged**; new test/snapshot/report are additions.

### Production — one file only

`/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/auth/class-sms-service.php`

Immediately before the existing numeric/finiteness guard, when decoded data is a `stdClass`, the parser extracts only its known `id` property into the local candidate. The same unchanged strict number-type/finiteness and HTTP/status checks then apply. There is no numeric cast until after explicit int/float type validation. This reads the actual response field internally solely for validation; the value is not returned, logged or stored. Task9F continues recording only its safe structural type.

The request URL/headers/body, Edge adapter, settings/readiness/arming, Origin handling, OTP manager, rate limiter, failed-challenge invalidation, single-use CAS and best-effort diagnostic storage are unchanged. No frontend file changed.

### Other files

- New `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-9g-response-contract.test.php` — four offline tests with actual service/manager and fake WP HTTP/options/DB boundaries.
- Updated `/Users/binam/project/پرهیزکاری/karban-uiux/web/docs/wordpress-integration/faraz-sms-setup.fa.md` — Task9G evidence and exact known contract added; earlier Task9D/E/F sections retained as historical evidence.
- New `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9g-before.snapshot`.
- New `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9g-report.md`.

All prior Task9D/E/F tests and reports were preserved byte-for-byte. Inspection and execution found **no prior fixture rejecting root success with a finite numeric object id**, so no previous expectation needed changing: previous object negatives are empty objects, wrong-type IDs, wrong root status or nested/other invalid structures, all still rejected. The new RED explicitly demonstrates the superseded numeric-data-only contract rather than deleting any old negative.

## TDD and regressions

Before production change: **4 focused tests, 3 expected failures** (numeric object-id acceptance, accepted result under diagnostic storage failure, normal manager receipt); strict-negative matrix already passed.

After the minimal candidate extraction: **4/4 passed**.

Coverage:

- HTTP200/201 and both numeric contracts, including zero, negative, fractional and exponent-notation numbers.
- Wrong root/status, HTTP200 alone, status error, missing id, bool/string/null/list/object/nested id, nonfinite numbers, list data, malformed JSON and oversize response remain rejected.
- Unsupported HTTP statuses202/204/301/401/500 remain rejected even with valid-looking object-id success body.
- One HTTP request only; no actual provider ID or unknown fields in returned diagnostic.
- False/throwing diagnostic storage cannot change accepted result or trigger resend.
- Real OtpManager issues its ordinary tracking receipt; no OTP/provider ID is returned. Existing generated OTP verifies once, and second consumption fails safely.
- Wrong-type id failure invalidates the failed challenge and retains cooldown; the next request is throttled with no second send.

## Final verification

- **18/18 PHP suites passed**, all prior17 plus Task9G, using active plugin source and no WordPress bootstrap.
- Focused Task9G **4/4**; prior Task9D13/13, Task9E4/4 and Task9F6/6 continue passing without fixture edits.
- **67 PHP files syntax-clean**, active-plugin includes/rest-api plus tests.
- Full guarded Node baseline **303 passed, 0 failed**, 270 top-level subtests.
- TypeScript `--noEmit --incremental false` **passed**.
- Isolated guarded Next16.3.0 Webpack production build **passed**, compilation, TypeScript, static generation and traces complete.
- `git diff --check` and source-baseline added-line whitespace audit **passed**.
- Baseline audit: one production file plus setup guide changed; all other captured files unchanged.

No ESLint rerun was necessary for this PHP-only correction; the prior scoped lint passed. Known full-repository lint remains **4 existing errors / 8 warnings**, including the existing task-7d offline helper’s no-assign-module-variable and three no-require-imports errors. No unrelated lint fix or new full-lint success is claimed.

Build isolation used only explicit nonsecret source/public/build inputs copied to a new `$TMPDIR` directory, linked installed node_modules, isolated HOME and scrubbed environment, telemetry disabled, and existing inherited Task9C HTTP/fetch/DNS/socket guards. No `.env`, wp-config, runtime DB or active `.next` was copied/cleared. No server was started. Existing local system-certificate initialization warnings may appear in static command logs; they are not provider/network results.

Scratch evidence under `$TMPDIR`: `task9g-red.log`, `task9g-green.log`, per-suite `task9g-*.test.php.log`, `task9g-php-syntax.log`, `task9g-all-node.log`, `task9g-tsc.log`, `task9g-build.log` and `task9g-build-location`. Existing Task9C offline loader/guard were reused without alteration.

## Review and next action — not executed

Review the one production change against the immutable snapshot and the new RED/GREEN regression. Actual response type evidence plus supplied official prose supports this bounded additional contract, not arbitrary response relaxation. Actual ID value remains unread; only the runtime parser checks whether it is finite. No additional diagnostic or raw response logging is needed.

After independent review, any actual login recheck requires separate explicit operator approval, their own private controlled recipient and normal cooldown. No send was authorized or executed by this implementation. Keep acceptance separate from delivery and full login completion; neither is claimed verified on the corrected version.
