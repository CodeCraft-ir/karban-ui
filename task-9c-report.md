# Task 9C — Bounded OTP SMS failure diagnosis

## Result and evidence boundary

Implemented and verified the **observability fix**, not an established provider-root-cause fix. Historical provider cause remains **UNKNOWN**. No historical response body was available, and the new record cannot reconstruct earlier attempts.

Provided/relayed observations: local SMS5 readiness/schema flags were true, provider configuration was syntactically present, native Next logs showed several request 503s followed by 429, no historical SMS receipt was reported, and the approved pattern placeholder matches the saved variable `code`. These observations do not distinguish TLS/DNS/timeout, provider HTTP rejection, or a response shape that failed the strict acceptance parser. No message received is not proof that the provider never accepted a request. `providerConfigured` is syntactic configuration readiness, not credential/account/balance/pattern validity or delivery proof.

Confirmed source root of the **observability gap**: SmsService's controlled `sms_misconfigured`, `sms_transport_error`, and `sms_provider_error` were not allowed through WordPressAuthGateway's safeFailure, and AuthCoordinator's safeError collapsed them again to `auth_unavailable` / 503. There was no bounded last-attempt admin record. Both gaps are now covered by executable tests.

No actual SMS, provider ping, real test HTTP, WordPress bootstrap, DB query, admin save, counter clearing, environment/configuration/credential change, installation-secret read, phone lookup, dependency installation/change, or subagent was performed. Only in-memory fake WP boundaries and fake HTTP were exercised. The actual target was not read, recorded, or echoed. No provider endpoint, authentication header, payload, pattern, sender, variable, or strict accepted-ID rule was changed. No browser/live-admin verification was attempted because that would violate the no-real-HTTP/no-bootstrap boundary; actual registered callbacks and a mounted jsdom LoginForm were tested offline instead.

## Baseline, scope, and repository concurrency

Source-only text/SHA-256 baseline captured before functional changes:

- `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9c-before.snapshot`

221 captured source/test/package files; final audit: **5 changed, 216 unchanged**, zero added-line whitespace issues. Package manifests and existing jsdom dependency are unchanged. No profile/gallery/owner/client production source was edited. The separate old plugin copy was not changed.

Exactly five production files changed against that immutable baseline:

1. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/auth/class-sms-service.php` — future-attempt bounded diagnostic, safe transport classification, best-effort single-option persistence; existing `send_otp(string $phone, string $code)` continues returning `true|WP_Error`.
2. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/admin/class-admin-panel.php` — escaped, `manage_options`-only last-attempt projection in the existing settings page.
3. `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/auth/wordpress-auth.ts` — three static SMS gateway presentations; upstream messages/data/status are not forwarded.
4. `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/auth/auth-coordinator.ts` — same exact three categories in the typed coordinator union with fixed 503 statuses.
5. `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/lib/auth-ui.ts` — safe Farsi mapping used by the existing LoginForm error parsing path. Unknown/nonstring codes retain generic redaction, and 429 takes priority.

No route, readiness, runtime policy, OTP manager, settings validator, LoginForm, or profile production changes were needed. Existing route adapters already serialize only the coordinator's controlled `{error:{code}}`; the real production composition regression verifies this path.

New executable tests:

- `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-9c-diagnosis.test.php`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/auth/task-9c-production.test.ts`

An external repository commit occurred while this task ran: observed HEAD moved from `2c72c0f` to `39328e9`, incorporating files that had been dirty. This writer issued **no git add, commit, reset, revert, rebase, or push** and preserved the external HEAD. Review must use the immutable snapshot plus new test files, not assume a clean HEAD diff means no Task9C changes. Final test additions remained working-tree modifications at verification time.

## Admin-only diagnostic contract

Single option: **`nahan_last_otp_send_diagnostic`**, constant `SmsService::LAST_OTP_DIAGNOSTIC`. Writes use `update_option(..., false)` and replace the one record; there is no history collection or outbox.

Existing registered settings page: `nahan-settings` / title **«آخرین تلاش ارسال پیامک ورود»**. Getter: `SmsService::last_otp_diagnostic(): ?array`; it checks `manage_options` itself. Renderer also checks capability and escapes each bounded value with `esc_html`. No JavaScript, hidden secret, REST registration, public getter route, send button, or debug/proxy endpoint was added.

Record fields:

| Field | Allowed values |
| --- | --- |
| `timestamp` | UTC `YYYY-MM-DDTHH:MM:SSZ`, attempt-start time |
| `provider` | `faraz_ippanel`, `kavenegar`, `unknown` |
| `outcome` | `misconfigured`, `transport_error`, `provider_rejected`, `invalid_response`, `accepted_not_delivery`, `unexpected_error` |
| `http_status` | Optional integer 100–599, only when known |
| `vendor_code` | Optional `meta.message_code` string matching exactly three ASCII digits, hyphen, one to three ASCII digits; unknown/malformed types and shapes are omitted |
| `transport_class` | Optional `TLS`, `DNS`, `timeout`, `connect`, `unknown` |

Transport mapping uses known timeout codes or the standard WP `http_request_failed` anchored numeric `cURL error N:` prefix internally. Only the fixed class is retained; arbitrary raw wording does not infer a class. Unrecognized codes are `unknown`. Unexpected exceptions are suppressed into a controlled public failure, with `unexpected_error` rather than a guessed transport cause.

For Faraz, non-2xx HTTP or boolean `meta.status === false` records `provider_rejected`; HTTP2xx with malformed JSON, missing/wrong meta status, oversized body, or unexpected/invalid IDs records `invalid_response`. Strict HTTP2xx + boolean true + nonempty JSON list of positive integer IDs remains mandatory for `accepted_not_delivery`. That result is **not delivery confirmation**. Invalid response shape can follow provider acceptance; do not interpret it as permission to resend or relax the parser.

No target phone, user ID, OTP, request/response body, raw error/message, header, API key, pattern/sender value, exception, or outbox ID is in the record or public DTO. Both write and read projection are allowlisted. Corrupt/extra optional stored values are dropped; invalid core records are not rendered.

Only the existing valid-input `SmsService::send_otp` attempt writes a record, including a configuration-blocked attempt. Invalid input, configuration readiness, admin rendering, simulation, and free-text sending do not fabricate attempts. The OTP manager's upstream gate/throttle can reject before SmsService; such a rejection intentionally leaves the previous record untouched. Nothing records fake attempts on the installation.

Persistence is deliberately best effort: false returns and thrown storage exceptions do not change accepted provider results into failures or trigger retries. Therefore a missing/stale record is possible; compare its timestamp to the approved attempt. No raw storage exception is rendered/logged by this implementation. The field explicitly warns about future-only coverage, historical uncertainty, delivery limits, and timestamp freshness.

## End-to-end public behavior and invariants

WordPress controlled SMS error → real REST client → WordPressAuthGateway allowlist → AuthCoordinator allowlist → existing route adapter → LoginForm's existing unknown-code parser/map path:

- `sms_misconfigured` → fixed 503, safe configuration/support text.
- `sms_transport_error` → fixed 503, safe uncertain-send/wait text.
- `sms_provider_error` → fixed 503, safe unconfirmed-provider-response/support text, not a claim about credentials or delivery.
- Existing rate/throttle errors → `rate_limited` / **429**.
- Unknown upstream errors → `auth_unavailable` / 503, without raw upstream message/data/status/code passthrough.

Only static known categories are exposed. Admin HTTP/vendor/transport fields are **not** public debug fields. Existing gateway error normalization is retained; no generic REST error parser refactor was introduced.

No challenge is sealed or success navigation performed for an error. No fixed-code fallback, retry, phantom success, or throttling bypass was added. Failed-send exact-challenge invalidation, phone/IP cooldown, expiry, attempts, consume CAS, single-use verification, and Task9B trusted-mode gates are unchanged and covered by existing regression suites.

## RED/GREEN and final verification

Observed TDD sequence:

1. New PHP diagnostic suite against baseline: **8 tests, 5 failures** — missing admin field and missing last actual attempt. Existing storage-result/capability/lifecycle behavior already passed.
2. Actual production Next composition against baseline: **2 tests, 2 failures** — expected static SMS category returned generic `auth_unavailable`, and the Farsi mapper returned generic 503 text.
3. After implementation: PHP **8/8**, Node **2/2**.
4. Expanded final PHP diagnostic suite **11/11**, including configuration/exception paths, replacement-only record, non-OTP/no-record, legacy compatibility, safe/corrupt option projection, real registered menu and OTP callbacks, rejected/invalid/accepted response matrix, strict vendor codes, TLS/DNS/timeout/connect/unknown, best-effort persistence, secret canaries, failed-challenge invalidation and retained throttle.
5. Added real mounted LoginForm regression, using actual AuthFlowProvider, Next AppRouterContext, hooks and GSAP with reduced-motion jsdom: final focused Node suite **3/3**. Each explicit submission makes one fake request; failures render fixed safe Farsi, never navigate or show a ready challenge. No UI production edit or effect mock was needed.

Tooling/fixture corrections were not product bugs: direct cached TSX invocation initially selected CommonJS for top-level await; the final synchronous TypeScript/TSX module loader supports aliases, extensionless imports, and Next modules. An initial full run had four loader-resolution failures; the corrected loader then passed the entire suite. A provisional malformed-code fixture assumed no trimming, but the existing generic WordPressApiError contract normalizes code whitespace; the final unknown-code cases exercise genuinely unknown names without altering that shared behavior. The mounted Next fixture was updated for Next16's required `bfcacheId` and React's required children typing. No dependency/config change was made for any of these.

Final checks, after the final test changes:

- **All 14 standalone PHP suites passed**, using the active XAMPP plugin source; Task9C **11/11**, Task9A **20/20**, Task9B **12/12**.
- PHP syntax: **63** files under active-plugin includes/rest-api and WordPress tests passed.
- Full Node suite with TSX/alias resolution and inherited fail-before-network HTTP/fetch/socket/DNS guards: **303 passed, 0 failed** (270 top-level subtests).
- `tsc --noEmit --incremental false`: **passed**.
- Scoped ESLint for all four changed/new TypeScript files: **passed**.
- Full repository ESLint: **NOT GREEN**, **4 existing errors / 8 warnings**, including `.superpowers/sdd/staged-inventing-karp/task-7d-offline-build.cjs` (no-assign-module-variable and three no-require-imports errors). Unrelated source/snapshot warnings remain. Those files were not edited.
- Final isolated offline Next **16.3.0 Webpack** build: **passed**, compile, TypeScript, static generation and traces completed. Only source/public/nonsecret build inputs were copied under `$TMPDIR`; installed node_modules were linked. Scrubbed child environment and inherited network guards were used. No `.env`, wp-config, runtime DB/data, or active `.next` was copied or cleared. No server was started.
- `git diff --check`: **passed**; snapshot-based added-line whitespace check for external plugin changes: **passed**.
- Snapshot scope audit: exactly the five production files above changed, **216/221 captured files unchanged**.

Scratch evidence uses `$TMPDIR/task9c-*`: `task9c-php-red.log`, `task9c-node-red.log`, `task9c-php-green.log`, per-suite PHP logs, `task9c-all-node-final.log`, `task9c-tsc.log`, `task9c-scoped-lint.log`, `task9c-full-lint.log`, `task9c-php-lint-final.log`, and `task9c-webpack-final.log`. Final offline loader/guard are `$TMPDIR/task9c-tools/register.mjs` and `$TMPDIR/task9c-tools/offline.cjs`; isolated build location is in `$TMPDIR/task9c-build-location`. Early Node runs emitted a system-certificate trust-store initialization warning; it is not a provider response or evidence of a provider request.

## Next operator workflow — not executed

1. Independent controller reviews this source slice against the immutable baseline; no further configuration/credential/spec change is justified by current evidence.
2. Authorized admin opens the existing settings page and locates **«آخرین تلاش ارسال پیامک ورود»**. Initially it may say no valid attempt recorded. Rendering is read-only, not a provider probe.
3. After normal cooldown/rate admission and **separate explicit approval for one send**, the operator submits their own controlled target privately through the normal login flow exactly once. No resend button/counter clear/debug endpoint is involved.
4. Compare the diagnostic timestamp with that one attempt and inspect only the bounded provider/outcome/HTTP/vendor-code/transport-class fields. The BFF returns a safe static category or normal challenge; it never returns this admin record.
5. If `accepted_not_delivery`, do not call it delivered; verify receipt and the code only through the normal existing flow. If transport/invalid-response/exception, acceptance may be uncertain; stop rather than automatically retry. If no fresh diagnostic appears, the request may have been blocked before SmsService or best-effort persistence may have failed; do not label an old record as the new result.
6. Historical root cause stays UNKNOWN unless independent actual evidence resolves it. No live acceptance/delivery, credential validity, provider account issue, or historical failure repair is claimed by this task.

Independent review and any future one-send approval remain outside this completed source/offline implementation.
