# Task 9A — Faraz/IPPanel provider and safe SMS settings

## Outcome and boundary

Implemented the approved source-only slice in the active XAMPP plugin. Offline tests are green. This is **not live SMS acceptance or delivery proof**. No credentials were read from the installation, entered, printed, or copied. No real HTTP/provider ping, SMS, WordPress bootstrap, DB/admin save, config/environment/dependency change, commit, or subagent was used.

Local fixed `145632`, default driver selection, local gates, five/six-digit provenance, JWT behavior, and BFF/mode policy remain unchanged. No gallery/owner/client/UI source was edited. Existing media 9 and runtime data were not touched by this task; the controller's independent gallery reproduction is outside this change.

## Actual artifacts and source diff scope

Baseline, captured before functional edits (source text/hashes and 15 pre-existing user-file hashes; no runtime/config values):

- `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9a-before.snapshot`

New executable offline test:

- `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-9a-sms.test.php`

This report:

- `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9a-report.md`

Exactly four active-plugin source files changed relative to the snapshot:

1. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/auth/class-sms-service.php` — Faraz pattern adapter, internal readiness, fail-closed OTP paths, controlled provider errors, explicit Faraz text unsupported result. Existing Kavenegar acceptance remains supported; key validation and error redaction also cover that OTP path.
2. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/auth/class-otp-manager.php` — checked invalidation of the exact persisted challenge on non-successful real transport; simulation and verification/CAS logic untouched.
3. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/admin/class-admin-panel.php` — registered SMS sanitizers, capability/nonce enforcement, masked/blank SMS key fields and explicit clear controls, checked non-autoload persistence.
4. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/admin/class-settings.php` — shared bounded SMS-field validation; existing general settings methods unchanged.

The old plugin copy was not modified. External active-plugin changes are compared to the snapshot, not assumed to appear in the web repository's git diff. No separate diff artifact was created. Final scope inspection found all 15 captured pre-existing user files byte-identical by SHA-256; unrelated controller browser artifacts were left alone.

## Provider contract and interfaces

Contract evidence is the approved brief, not a newly fetched SDK or network probe:

- https://ippanelcom.github.io/Edge-Document/fa/docs/
- https://ippanelcom.github.io/Edge-Document/docs/send/pattern

`SmsService::send_otp(string $phone, string $code)` keeps the existing `true|WP_Error` interface. `faraz_ippanel` is an additional exact driver allowlist member; no driver selection was saved or changed.

The Faraz adapter sends exactly one native `wp_remote_post` to `https://edge.ippanel.com/v1/api/send`:

- Raw API key in `Authorization`, without `Bearer`; no username/password or panel-login OTP flow.
- `Accept` and `Content-Type`: `application/json`.
- Timeout 10 seconds; redirection 0; HTTP response limit 16,384 bytes, checked again before JSON decoding.
- Typed JSON: `sending_type: "pattern"`, configured `from_number`, configured pattern `code`, one E.164 Iranian mobile in `recipients`, and an object `params` mapping the configured variable to the existing manager's OTP. Numeric variable names still serialize as object keys, not a JSON list.
- Shared Iranian mobile normalization, then domestic `09…` to `+989…`; no sender guessing, arbitrary endpoint, retry, provider failover, log fallback, simulation fallback, or returned OTP/outbox IDs.
- Acceptance requires HTTP 2xx **and** boolean `meta.status === true` **and** a nonempty actual JSON list of positive integer `data.message_outbox_ids`. Numeric-keyed JSON objects, empty/bad IDs, scalar bodies, malformed/oversized JSON, redirects, authorization errors, provider rejection, and transport errors are rejected.
- Acceptance means accepted by the provider, not a delivery receipt. Faraz free-text notification sending returns `sms_text_unsupported`; it is not advertised as implemented.

New internal `SmsService::is_otp_configured(): bool` validates local settings only. It performs no HTTP, publishes no status endpoint, exposes no secret, and is not yet wired into mode/BFF policy.

Controlled errors include `sms_misconfigured`, `sms_driver_unknown`, `sms_invalid_phone`, `sms_invalid_otp`, `sms_provider_error`, `sms_transport_error`, `sms_text_unsupported`, and checked-lifecycle failure `otp_storage_unavailable`. Provider/transport bodies, raw causes, authorization, OTP, and full phone are not added to these errors or OTP logs.

## Settings and secret handling

Private WordPress options:

| Option | Validation / semantics |
| --- | --- |
| `nahan_sms_driver` | Exact `kavenegar`, `log`, or `faraz_ippanel`; existing default `kavenegar` unchanged |
| `nahan_sms_faraz_apikey` | Nonempty 1–512 printable ASCII bytes; controls and whitespace rejected, never trimmed/repaired or echoed |
| `nahan_sms_faraz_pattern_code` | 1–128 printable non-whitespace ASCII bytes, no controls |
| `nahan_sms_faraz_originator` | Strict `+` E.164 syntax, nonzero first digit, at most 15 digits |
| `nahan_sms_faraz_variable` | 1–64 ASCII letters/digits/underscore/hyphen; absent-option default `code` |

The existing Kavenegar SMS key is also rendered as an empty password input. Both key inputs have autocomplete off and a presence-only yes/no indicator; no saved value, hidden secret, or secret-bearing JavaScript is rendered. Blank/missing key input retains the stored key. Explicit `nahan_sms_faraz_apikey_clear=1` or the corresponding Kavenegar clear checkbox is a separate intent. `manage_options` and the existing `nahan-settings-options` nonce are required for mutation/clear. Unauthorized sanitizer calls stop safely, including first-time options, before an outer Settings API write can create defaults. Invalid fields retain prior values and add controlled validation errors, rather than being silently treated as clear.

SMS options are registered with actual sanitizer callbacks and `show_in_rest=false`. The existing form remains on `options.php` with `settings_fields('nahan-settings')`.

Persistence detail for independent review: `options.php` normally calls `update_option` without an autoload argument. The SMS sanitizer therefore performs a checked `update_option(option, vetted_value, false)` under a bounded per-option re-entrancy guard and verifies the stored result. Its return makes the outer Settings API update a no-op. Retained existing secrets use the reviewed `wp_set_option_autoload(option, false)` API; its false/no-change return is distinguished from a storage error via `wpdb->last_error`. A storage failure stops with a controlled message, not a false success. Invalid first-time secret input also preserves an empty value through non-autoload persistence. This code was exercised only against in-memory fakes; **no live migration or save was executed**.

No JWT secret or non-SMS module settings were changed, and no homemade encryption/storage mechanism was added.

## OTP failure lifecycle

Real requests still use the normal random five-digit code, hash, TTL, throttles, tracking and persisted context. On a result other than strict `true`, the manager executes a prepared conditional deletion matching **this tracking code and code hash, with `consumed_at IS NULL`**. Exactly one affected row is required. Zero/false invalidation results become safe `otp_storage_unavailable` errors. Unrelated challenge rows are untouched, no consumed-success state is written, no tracking success is returned, and throttling is not cleared. Timeout acceptance is uncertain, so there is no automatic resend.

The explicit local simulation continues to bypass SmsService entirely. The existing verification, attempts, expiry, consume CAS and credential-provenance paths were not modified.

## TDD evidence

The suite invokes the real SmsService, OtpManager, Settings validator, and actual registered AdminPanel sanitizer/render callbacks. Only external HTTP, WP option/persistence, and DB boundaries are faked; no source-grep substitute proves provider/admin behavior.

Observed progression:

1. Initial confirmed RED: **9 tests, 9 failures** before functional implementation. Missing HTTP boundary, log-success fallback, absent readiness, unmasked keys, missing registered sanitizers, unchecked persistence and absent challenge invalidation all failed.
2. First GREEN: **9 tests, 0 failures**.
3. Additional shape/authentication RED: **14 tests, 4 failures** — numeric variable serialized as array, object-shaped IDs mistaken for list, invalid legacy key boundary, unauthorized first-time option creation. Those defects were corrected.
4. Invalid first-secret/autoload RED: **15 tests, 1 failure**, then corrected.
5. Invalid legacy-phone RED: **17 tests, 1 failure**, then corrected.
6. Final focused GREEN: **17 tests, 0 failures**.

Coverage includes exact URL/auth/body/one-recipient/timeout/redirect limits; missing/invalid configuration and phones; meta false/string, bad/empty/object IDs, invalid/oversized JSON, redirect/401/422/500, timeout and no retries; readiness/render/sanitizers doing no HTTP; actual masked form, nonce, escaped fields, blank retain/change/clear, authorization and strict validators, autoload false and write failures; OTP no-log behavior; only-the-failed-challenge invalidation with checked failure handling, retained throttle and normal successful hash/TTL/provenance; Kavenegar acceptance compatibility and safe error redaction.

## Final verification

From `/Users/binam/project/پرهیزکاری/karban-uiux/web`:

```sh
for f in tests/wordpress/*.php; do
  php "$f" /Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core || exit 1
done
```

All **12 standalone PHP suites passed**: 17 new Task 9A cases plus all **11 prior suites**. Prior suite output includes local profile 176 checks, owner foundation 148 assertions, provisioning 55 assertions, media 237 assertions, Task 7A 44 cases, plus local OTP, credential, financial, admin, taxonomy and public-profile boundaries.

An earlier invocation omitted the plugin-path CLI argument and produced harness errors in `local-profile-save`, `public-profile-guard`, `task-7b-owner`, `task-7b-provisioning`, and `task-7c-media`. These were invocation errors, not suppressed failures; the complete final run above supplies the required argument and passes all of them.

Additional checks:

- `php -l` passed for all active-plugin PHP source and all web WordPress PHP tests: **65 files**.
- `git diff --check` passed for tracked web changes.
- Snapshot-based unified diff inspection/added-line whitespace checks passed for the four external plugin files.
- All **15 captured pre-existing user-file SHA-256 checks passed**.
- No Node/full UI build was run because frontend source was untouched.

The controller requested a pause after that green run for its separate gallery reproduction. No Task 9A source was changed during or after the pause. On resume, only this report and final scope/diff evidence were completed; the full suite was not needlessly repeated.

## Self-review and remaining limits

Self-review checked the approved brief against provider dispatch, raw-key fixed HTTPS transport, strict acceptance, error privacy, secret retention/clear/capability/nonce/autoload behavior, first-save and PHP JSON-shape edges, exact-challenge invalidation, unchanged local gates/defaults and source scope. No additional implementation was added after final green verification.

Independent controller review is still required. Offline fakes are not live WordPress/DB/admin-form integration or provider/account-plan compatibility proof. In particular, review the registered sanitizer's checked re-entrant persistence and retained-secret autoload API handling before an actual admin save.

Deferred to a separately approved next slice: local/real mode and BFF policy integration using the internal readiness seam; operator entry of a new API key and approved pattern/sender/variable through the secured admin form; and only then a separately approved single-phone controlled real acceptance test. Never request the secret in chat, read existing stored values, or claim delivered from outbox acceptance. Gallery/native preview issues remain independent and were not changed here.

## Independent-review correction — fix 1: original submitted key validation

This is a scoped strict-validation/spec correction. The review did **not** identify an Important/Critical security defect; this report makes no such severity claim.

Verified against the installed source `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-admin/options.php`, lines 336–345: WordPress takes the submitted slashed scalar, calls `trim`, then `wp_unslash`, and only then `update_option`. The original sanitizer therefore saw an already-trimmed argument: a key surrounded by spaces/CRLF/tabs could be silently repaired and saved, contrary to the approved no-repair rule. Whitespace-only input could also be mistaken for intentional blank retention. No actual WordPress request or stored secret was read to establish this.

### Correction and bounded diff

Only `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/admin/class-admin-panel.php` has an additional functional source change in this round: six added lines (three explanatory comments plus a three-line condition/assignment block). After existing capability/nonce checks, only allowlisted SMS secret fields from `option_page=nahan-settings`, `action=update`, with an actually present POST field take their validation value from `wp_unslash($_POST[option])`. There is no trim/repair. Re-entrant checked persistence still receives the vetted value under its existing guard.

Both Faraz and Kavenegar key fields use this boundary. Non-settings/programmatic contexts continue to validate the supplied argument, not unrelated POST fields. Exact empty input and missing fields retain the old key; whitespace/control-containing or non-string submitted keys are invalid and retain it with the existing controlled validation notice. Authorized explicit clear remains separate and intentional. Configured-presence rendering, capability/nonce checks, checked storage, and non-autoload retention remain unchanged. No raw submitted input is logged, returned in errors, or rendered.

New pre-fix artifact:

- `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9a-fix-1-before.snapshot` — source, test, and report text/hashes immediately before this correction; no runtime/config values.

Updated artifacts:

- `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-9a-sms.test.php`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9a-report.md` (this appended section)

### RED → GREEN evidence

Added three actual registered-sanitizer boundary cases using a harness that mirrors the installed `options.php` order: original synthetic input is slashed into `$_POST`, the scalar callback argument is trimmed **before** unslashing, and `update_option` then invokes the real registered sanitizer. The test `wp_unslash` boundary was made realistic with recursive `stripslashes`; synthetic quote/backslash bytes verify exactly-once unslashing.

Observed RED before the six-line source correction:

```text
FAIL options.php preprocessing cannot repair malformed submitted SMS keys:
  Malformed raw key must retain prior key despite normalized argument
20 tests; 1 failures
```

Observed GREEN after correction:

```text
PASS options.php preprocessing cannot repair malformed submitted SMS keys
PASS options.php slashed exact valid blank missing and explicit clear retain semantics
PASS raw settings submission cannot bypass capability nonce or direct-call validation
20 tests; 0 failures
```

The table-driven cases cover both SMS key options, leading/trailing spaces, CRLF and tabs, whitespace-only submissions, non-string input, preservation of the prior configured key and non-autoload state, masked output, exact valid slashed key bytes, exact-empty/missing retention, deliberate clear, unauthorized first-time save/clear, and direct programmatic argument validation outside a settings POST. No case performs a real save or HTTP request.

### Fresh verification and self-review

After this source correction, reran all 12 standalone PHP suites with the active plugin path supplied: **20 new cases plus all 11 prior suites passed**, with no stderr/warnings. Reran `php -l` over active-plugin PHP and web PHP tests: **65 files passed**. `git diff --check` passed. The snapshot-based fix diff contains only the six-line admin sanitizer source addition; all **15 original user-artifact hashes remain unchanged**.

Self-review checked that original-POST recovery happens only for the two allowlisted secret fields in the settings update context and after authorization, uses unslashing without normalization, and cannot turn malformed input into blank retention. Clear precedence, absent-field handling, non-settings direct validation, re-entrant checked persistence, masking and autoload behavior were exercised. This remains source/fake-boundary evidence, not live admin-save or SMS proof. The same independent reviewer should perform scoped verification before the next slice.

No provider, OTP lifecycle, local gates/defaults, BFF/mode policy, UI/gallery, runtime data, credentials/config, dependencies or commits were changed in fix 1. No network, live WordPress bootstrap, DB/admin save, SMS or subagent was used.
