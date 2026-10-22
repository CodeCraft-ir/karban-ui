# Task9F — bounded admin-only IranPayamak response-shape observability

## Result and evidence boundary

Implemented **structural diagnostics only**, local source/offline. **No acceptance predicate was changed** and no actual response schema is claimed fixed.

Relayed evidence: the human operator again reported SMS received but UI error. The controller’s read-only admin observation was timestamp `2026-10-22T04:58:16Z`, provider `faraz_iranpayamak`, outcome `invalid_response`, HTTP200. Task9E’s HTTP gate therefore no longer explains that attempt, but the actual body/field mismatch is unknown. No raw response was available. Historical bodies cannot be reconstructed by this change.

No provider/document/network request, additional SMS, live-admin visit/save, WordPress bootstrap, actual DB access, secret/key/recipient read, runtime configuration/environment change, installation, dependency change, git mutation or subagent occurred. No denied host was retried or bypassed. No user recipient/example OTP was reproduced or persisted. The new tests use fictitious canaries only.

## Frozen baseline and exact files

Source-only before snapshot, captured before Task9F changes:

`/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9f-before.snapshot`

- **181 files**, read-only mode `0444`, per-file SHA-256 and source text.
- Snapshot SHA-256: `2081cc0c7508b1f21d0f36112c055786116bd3564ab7ebf42badebba71b22ed1`.
- No runtime options, `.env`, wp-config, DB material or installation secrets.
- Final comparison: **3 captured files changed, 178 unchanged**. The new test/report/snapshot are additions.
- Previous Task9D/E reports, source evidence/tests and their snapshots were preserved. No old plugin copy was changed.

### Production — exactly two files

1. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/auth/class-sms-service.php`
   - Computes fixed structural facts immediately after the already-existing bounded JSON decode, for IranPayamak only.
   - Projects the fixed enum/boolean DTO on both diagnostic write and admin read, with parent/type relationships enforced.
   - No change to provider request, status/data acceptance predicate, public failure codes or retry behavior.
2. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/admin/class-admin-panel.php`
   - Existing escaped diagnostic renderer displays boolean fields as fixed text `true` / `false`, rather than ambiguous empty-string casting.
   - No form, probe, new endpoint or settings change.

### Tests/docs/evidence

- New `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-9f-response-shape.test.php` — six focused standalone offline tests using real SmsService/AdminPanel/OTP manager and fake in-memory WordPress/HTTP/DB boundaries.
- Updated `/Users/binam/project/پرهیزکاری/karban-uiux/web/docs/wordpress-integration/faraz-sms-setup.fa.md` — preserves previous evidence and adds the Task9F structural-only contract and future operator boundary.
- New `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9f-before.snapshot`.
- New `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9f-report.md` (this file).

No frontend, Settings validator, OTP-manager, policy gate, rate-limiter, route, schema or credential source changed.

## Exact safe admin field contract

The same **single best-effort option** remains `nahan_last_otp_send_diagnostic`. Existing timestamp/provider/outcome/HTTP/transport fields are retained. The new fields are projected only for `provider === faraz_iranpayamak` and are never public auth DTO fields.

| New field | Allowed stored/rendered values | Condition |
| --- | --- | --- |
| `response_root` | `invalid_json`, `too_large`, `null`, `bool`, `number`, `string`, `object`, `list` | Only after the existing response was returned and parsed/bounded |
| `response_status` | `success`, `error`, `other`, `missing`, `wrong_type` | Only when root is `object` |
| `response_data_type` | `null`, `bool`, `number`, `string`, `object`, `list`, `missing` | Only when root is `object` |
| `response_messages_type` | Same fixed type enum | Only when root is `object`; contents ignored |
| `response_id_type` | Same fixed type enum | Only when root is `object` and data type is `object`; checks only the known `id` property, not its value |
| `response_data_numeric_string` | Actual boolean `true` or `false` | Only when root is `object` and data type is `string` |

Rules:

- For nonobject/invalid/oversized roots, only `response_root` is retained; subordinate facts are dropped.
- A missing root field is distinct from null. An unknown status string becomes fixed `other`, not the original string. A nonstring present status becomes `wrong_type`.
- Objects and lists are distinguished, but no unknown property names or counts are recorded. Only known literal keys `status`, `data`, `messages` and, inside a data object, `id` are inspected.
- Numeric-string classification never casts or stores the actual string/number. It is a bounded lexical check: at most 64 bytes, optional minus, at most 32 integer digits without arbitrary leading zeroes, optional at-most-16 fractional digits and optional signed exponent of at most 3 digits. It is **not** an acceptance rule or a guarantee that every possible numeric representation matches.
- `number` is a structural type, not proof of finiteness or successful acceptance. The unchanged parser still checks finiteness before accepting.
- Invalid enum values, wrongly typed booleans and relationally invalid side fields are dropped on **both write and read**. No arbitrary record key is merged into the DTO.
- Admin access is `manage_options`-only. Nonadmins get no record. Keys and values are escaped by the existing renderer; booleans are converted only to fixed `true`/`false` text.
- No raw body/header/error, phone, OTP, API key, identity, arbitrary status word, actual ID/data value, messages contents, unknown key names or raw-derived counts enter the diagnostic or HTML. Canary tests include secrets in values **and object keys**.

## Lifecycle, bounds and unchanged acceptance

Shape computation occurs only after the single existing IranPayamak `wp_remote_post` returns. There is no extra HTTP request, response logging, outbox/history or debug endpoint. It reuses the existing **16KiB** response limit and **depth32** JSON decode. Oversized responses yield only `too_large`; decode errors, including depth failure, yield only `invalid_json`. No raw parser error or exception is stored.

Readiness, admin rendering and simulation do not create diagnostic attempts. No record is fabricated for a provider request that never occurred. Existing valid-input send attempts can still record configuration/transport outcomes with no response-shape facts, which is intentional.

The existing single-option write is still best effort and non-autoloading. False/throwing storage failures cannot turn an accepted result into failure or trigger a second HTTP request. Missing/stale records remain possible; timestamps must be compared to the actual approved attempt.

The Task9E acceptance guard was verified **byte-for-byte unchanged against the frozen baseline**:

- HTTP exactly200 or201;
- root status exactly string `success`;
- root data an actual finite JSON number, not bool/string/object/list/null.

No shape fact can relax this guard. Numeric-string `true`, nested ID presence or `status: other` does not justify accepting a new schema. Existing static public `sms_misconfigured`, `sms_transport_error`, `sms_provider_error` handling and safe 503 UI behavior remain unchanged. No new public debug field or frontend change was made. Failed-challenge invalidation, cooldown, CAS consumption, single-use behavior, mode/schema gates and no-retry/no-fallback behavior remain in force.

## TDD and verification

Observed TDD:

1. New structural suite against unchanged source: **5 tests, 5 expected failures** — missing shape facts, projection and rendering. One undefined-key warning accompanied the expected missing-field assertion in RED only.
2. Implemented structural facts and bounded projection: **5/5 passed**.
3. Added explicit readable boolean rendering test: **6 tests, 1 expected failure** because previous bool casting produced `1`/empty text.
4. Updated only the existing escaped renderer: **6/6 passed**.

Focused coverage includes fixed status/type matrices; null versus missing; scalar/list/object roots; invalid/oversized/depth-invalid JSON; data/messages/nested-id structural types; bounded numeric strings; secret values and secret object keys; corrupt/unknown stored fields and parent relationships; provider scoping; nonadmin denial; safe readonly admin output; noHTTP readiness; accepted false/throwing diagnostic storage; unchanged strict string-data rejection; failed challenge invalidation and retained throttle.

Final checks:

| Check | Result |
| --- | --- |
| All prior16 PHP suites + new suite | **17/17 passed**, against active plugin source, no bootstrap |
| Focused Task9F suite | **6 passed, 0 failures** |
| Existing Task9D / Task9E focused suites | **13/13 and 4/4 passed unchanged** |
| PHP syntax | **66 files passed**, active-plugin includes/rest-api + WordPress tests |
| Full Node suite, inherited Task9C fail-before-network guard/TSX loader | **303 passed, 0 failed**, 270 top-level subtests |
| TypeScript `--noEmit --incremental false` | **Passed** |
| Acceptance predicate comparison | **Byte-for-byte unchanged** |
| Baseline-added-line whitespace and `git diff --check` | **Passed** |
| Baseline scope | **2 production PHP files + setup doc changed; 178/181 captured files unchanged** |

To keep this diagnostic-only task narrow, Next production build and ESLint were **not rerun for Task9F**: no TS/TSX/config/public build input changed. The immediately preceding Task9E isolated offline Webpack build and scoped lint passed. Full repository ESLint at that verification remains **not green: 4 existing errors / 8 warnings**, with errors in `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7d-offline-build.cjs` (one no-assign-module-variable and three no-require-imports). This task does not claim a new full-lint/build run or repair unrelated helpers. The active `.next` was not touched and no server was started.

Scratch evidence under `$TMPDIR`: `task9f-red.log`, `task9f-green.log`, `task9f-render-red.log`, `task9f-render-green.log`, per-suite `task9f-*.test.php.log`, `task9f-php-syntax.log`, `task9f-all-node.log` and `task9f-tsc.log`. Existing offline guard/loader were reused without change.

## Independent review and next operator workflow — not executed

1. Independently review the two production files against the frozen Task9F baseline, especially enum-only projection, provider scoping, no raw values and the unchanged acceptance predicate. No subagent reviewer was run because it is prohibited here.
2. Do not expect the previous HTTP200 record to gain shape fields retroactively. Historical raw bodies remain unknown.
3. Only **after independent review and separate explicit approval**, the authorized operator may make one normal login attempt using their own privately controlled recipient after cooldown. This task did not grant or execute a send.
4. Inspect only the existing admin diagnostic and compare its timestamp to that specific approved attempt. The fixed root/status/data/messages/id types and optional numeric-string boolean can narrow the contract mismatch without revealing values.
5. A structural observation is evidence for review, not permission to relax acceptance or resend. Missing/stale record can reflect upstream admission or best-effort persistence failure. Stop on uncertainty rather than clearing throttle or retrying automatically.
6. Actual schema correction and live end-to-end login remain **unresolved/unverified**. Any later schema change needs evidence and a separate bounded review; this task intentionally makes no acceptance guess.
