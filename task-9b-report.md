# Task 9B — Explicit local SMS mode and configuration readiness

## Status and safety boundary

Approved source slice implemented in the active XAMPP plugin and frontend auth policy/contracts/BFF. Source/offline verification is recorded below. **Not activated; independent review is required before activation. Configuration readiness is not provider acceptance or delivery proof.**

No live WordPress bootstrap, DB access, admin save/arming, migration, seed, SMS/provider ping, real HTTP, credential/phone extraction, configuration or environment-file edit, dependency change, commit, or subagent was performed. Test HTTP, option writes, schemas and persistence are in-memory fakes. Test process environment values are synthetic and restored; no installation environment file was read or copied. No recipient was inferred from existing accounts. Task9A's provider adapter and settings validator remain byte-identical to this task's baseline. The Task9A raw-submission correction in AdminPanel is preserved.

No auth UI/gallery/owner/client production source was edited. Existing dirty user work remains intact. Work was performed inline in the supplied checkout, without a worktree/branch/commit, as requested.

## Baseline and implementation files

Before functional edits, captured **217 source/test files**, with text and SHA-256 only, in:

- `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-9b-before.snapshot`

Final snapshot audit: **18 captured files changed, 199 unchanged**. Exactly four active-plugin source files changed; all captured UI/gallery and app source files remain unchanged. The separate old plugin copy was not modified.

Active-plugin production files:

1. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/class-local-development-gate.php` — shared server-owned mode policy and simulation gate used by OTP and existing JWT local-provenance checks.
2. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/auth/class-otp-manager.php` — explicit mode resolution, local real-SMS schema prerequisites, safe readiness service. Existing random generation, hash/TTL, rate limits, consume CAS and Task9A failed-send invalidation retained.
3. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/admin/class-admin-panel.php` — dedicated guarded mode action, atomic checked policy persistence, separate operator form and configuration-only status.
4. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/rest-api/auth-routes.php` — registered fixed GET readiness route. Existing simulation-specific local-status response unchanged.

Frontend production files under `/Users/binam/project/پرهیزکاری/karban-uiux/web/`:

- `src/services/auth/contracts.ts`
- `src/services/auth/wordpress-auth.ts`
- `src/services/auth/auth-runtime-config.ts`
- `src/services/auth/auth-bff-policy.ts`
- `src/services/auth/auth-coordinator.ts`
- `src/services/auth/auth-bff.server.ts`

New executable tests:

- `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-9b-mode.test.php`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/auth/task-9b-mode.test.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/auth/task-9b-production.test.ts`

Existing test adjustments are bounded to the new readiness/receipt interface, realistic configured nonloopback production fixtures, new admin rendering WP boundary functions, and actual JWT mode-switch assertions. `src/services/profile/profile-route-adapters.test.ts` changes only its required trusted-readiness fixture, not profile production behavior.

## Exact server-owned interfaces and options

### Shared policy

`LocalDevelopmentGate::OTP_POLICY_OPTION` is **`nahan_local_otp_policy`**. It is one atomic WordPress option, not two independently writable settings and **not registered with ordinary options.php settings**:

- Armed: `['mode' => 'sms', 'sms_armed' => true]`
- Disarmed: `['mode' => 'local_simulated', 'sms_armed' => false]`
- Missing option: compatibility default, subject to the existing simulation gates.
- Partial/malformed/unknown state: unavailable, not a transport or simulation fallback.

`LocalDevelopmentGate::otp_mode(bool $provider_configured): ?string` returns `local_simulated`, `sms`, or `null` (unavailable). `is_otp_simulation_enabled()` now also requires the absent compatibility policy or explicit disarmed policy. Existing OtpManager and JWT issuance/access/refresh local-provenance checks reuse this same gate; no separate JWT implementation was added.

For a local installation, real SMS requires all of:

- `NAHAN_LOCAL_DEVELOPMENT === true`;
- WordPress environment exactly `local`;
- canonical configured loopback installation URL;
- actual direct loopback peer (not Host/forwarded headers);
- the exact armed atomic policy above;
- `SmsService::is_otp_configured() === true` from previously saved settings;
- OTP provenance schema and transactional credential provenance schema ready.

`NAHAN_LOCAL_DEV_OTP === true` remains required for fixed simulation, not for explicitly armed real SMS. Local simulation remains fixed **145632 / six digits**, without invoking a transport. A loopback installation cannot start real-sending merely because the simulation flag is absent/false. Local classification is deliberately broader than authorization: local environment, loopback configured host, and malformed installation URLs cannot escape to production SMS when canonical validation fails. Valid nonlocal installations retain normal configured-provider random **five-digit SMS** behavior. No missing-credential/log/provider-error fallback is added.

### Operator action

Registered hook: **`admin_post_nahan_local_otp_mode`**.

Dedicated form submits POST to `admin-post.php` with:

- `action=nahan_local_otp_mode`;
- `_wpnonce` generated/verified for **`nahan-local-otp-mode`**;
- `operation=arm` or `operation=disarm`;
- for arm only, a separately entered exact **`confirmation=ENABLE_REAL_SMS`**.

Requires `manage_options`, POST, the action-specific nonce, base local gate, and (for arm) saved provider configuration plus both schemas. A normal SMS-key settings save cannot arm the policy. No hidden confirmation, login payload, browser mode flag, debug-send endpoint or automatic provider call exists. Both fields are written together using `update_option(..., false)` and verified by read-back; a failed write cannot be reported as success. Repeating an already matching state is a no-op. No policy save was executed against WordPress.

Disarm stores explicit simulation mode; fixed login only works if the existing simulation gates remain valid. Otherwise login is unavailable, never silently real SMS. The form warns about cost, cooldown, uncertain timeouts, no automatic retry and configuration-versus-delivery limits. Rendering publishes only safe mode/configuration/schema status, never a key/code/phone/provider account value.

### Readiness HTTP contract

New fixed **GET `/nahan/v1/auth/otp/readiness`** (under the configured WordPress REST base), backed by `OtpManager::readiness()` and registered permission/callback checks. Base local gate failure returns safe 404; unresolved/unavailable mode returns safe 503. Successful `data` contains exactly:

```json
{
  "mode": "local_simulated",
  "codeLength": 6,
  "otpSchemaReady": true,
  "credentialSchemaReady": true,
  "providerConfigured": false,
  "localRealSmsAllowed": false
}
```

The example is a synthetic contract example, **not the installation's observed configuration**. Armed/configured local SMS reports `mode: "sms"`, `codeLength: 5`, `providerConfigured: true`, `localRealSmsAllowed: true`; schema booleans reflect actual schema checks. No HTTP/provider readiness probe, migration, write, OTP, driver name, key, pattern, sender, full phone or account information is returned.

Old GET `auth/local-status` remains simulation-specific, with exactly `otpReady` and `credentialProvenanceReady`; SMS mode does not repurpose it as real-SMS readiness.

### Frontend/BFF contract

`WordPressAuthGateway.otpReadiness()` uses only fixed GET `auth/otp/readiness`. Strict parser requires the exact six-field shape, actual boolean types and coherent allowed mode/length pair. Unknown/missing/malformed fields fail closed.

`createOtpReadinessCheck()` returns a trusted `OtpReadinessReceipt`:

- `{ mode: "local_simulated", codeLength: 6 }`, or
- `{ mode: "sms", codeLength: 5 }`.

Loopback requests require the existing local-development gate and matching readiness before calling requestOtp. Missing/false/404/malformed readiness or mismatched expected mode yields BFF **503 with zero OTP requests**. Schema readiness is required in both local modes; provider readiness and explicit backend local-real-SMS permission are additionally required in SMS mode. Nonloopback production retains normal SMS5 without probing the local-only endpoint.

`AuthCoordinatorDependencies.ensureOtpReady` now requires that receipt. The coordinator checks the response against the independently obtained receipt **before saving/sealing** a challenge. A mode/length mismatch returns safe 503 and does not seal the issued challenge; no automatic resend/fallback occurs. It cannot undo an already issued upstream request. Backend persisted provenance remains the final authority during verification; browser role/mode/Host cannot choose OTP transport or reclassify a stored challenge.

### Exact environment requirements (not changed)

Existing:

- WordPress: `NAHAN_LOCAL_DEVELOPMENT`, `NAHAN_LOCAL_DEV_OTP`, local environment and configured canonical site URL.
- Next: `KARBAN_LOCAL_DEVELOPMENT=true`, `NODE_ENV` not `production`, configured loopback `WORDPRESS_URL` (HTTP or HTTPS), normal `APP_ORIGIN` and `IRON_SESSION_PASSWORD` prerequisites.

New independent Next opt-in: **`KARBAN_ALLOW_LOCAL_SMS=true`**, exact lowercase value. It never bypasses `KARBAN_LOCAL_DEVELOPMENT=true`, nonproduction or loopback checks. With this flag absent/false/unknown, Next expects simulation6, and refuses backend SMS readiness before requestOtp. With the flag true, Next expects SMS5 and refuses simulation fallback. No environment file or wp-config constant was edited.

Existing Task9A private provider options stay unchanged: `nahan_sms_driver=faraz_ippanel`, `nahan_sms_faraz_apikey`, `nahan_sms_faraz_pattern_code`, `nahan_sms_faraz_originator`, `nahan_sms_faraz_variable`. Key entry remains a future private operator action through the masked settings form, not chat or test extraction.

## Provenance, cooldown and failure behavior

- Fixed local challenge rows/credentials keep `local_simulated` / 6 provenance. Switching policy to SMS makes old local challenge verification, local JWT issuance/access decoding and local refresh fail through the current shared gate. Nothing reclassifies those as SMS.
- Ordinary real-SMS credentials retain their existing normal-SMS compatibility. This is not a new revocation scheme for all SMS credentials.
- Existing defaults retained: OTP TTL **120 seconds**, throttle **60 seconds**, phone **5 requests / 600 seconds**, IP **10 requests / 600 seconds**, verification maximum **5 attempts**; configured settings still control the existing values.
- Task9A strict provider errors and exact failed-challenge invalidation remain. Timeout/uncertain transport result does not return tracking success, preserve a verifiable failed challenge, clear cooldown, automatically retry or fall back to fixed/log transport.
- Successful real-mode faked delivery persists SMS5 context, and normal verification consumes it once through the existing conditional path. Existing role/provisioning/CAS/session-error behavior is retained.

## TDD and regression evidence

All behavior tests exercise actual production classes/callbacks/adapters; only external WP HTTP/options/schema/DB/cookie boundaries are substituted. No source-string test substitutes for mode/admin/readiness/BFF behavior.

Observed sequence:

1. Initial PHP mode/admin/readiness suite **7 tests, 6 failures** before production edits: accidental local sends, no atomic mode authority, mode-switch verification not denied, missing readiness method and missing dedicated admin action. Compatibility simulation was already passing.
2. First backend GREEN: **7 tests, 0 failures**.
3. Direct local real-SMS missing-schema and operator readiness-render cases: **9 tests, 2 failures**; after prerequisite/render changes **9 tests, 0 failures**.
4. Malformed canonical loopback installation escape reproduced: **11 tests, 1 failure**; broadened classification without broadening authorization, then **11 tests, 0 failures**.
5. Final PHP Task9B suite includes action-specific nonce (ordinary settings nonce rejected), actual registered OTP/readiness callbacks, forged Host/peer, saved-config prerequisites, partial/malformed policies, checked single-option write/failure, no GET/render/arm transport, real random5 context, timeout cooldown and single-use: **12 tests, 0 failures**.
6. Initial new Node BFF suite **6 tests, 2 failures** against the old readiness composition; trusted-match success/sealing path failed. After the receipt/parser/gateway/coordinator changes **6 tests, 0 failures**. Negative cases prove zero OTP dispatch, not merely safe rendering.
7. Runtime flag coverage verifies exact opt-ins, missing base flag, production, HTTP/HTTPS loopback and hostile/malformed origins. Existing policy/coordinator fixtures updated to the required trusted receipt.
8. Actual `auth-bff.server.ts` production composition is additionally executed with the real REST client/gateway/coordinator/iron-session port/route adapters; only Next cookie acquisition and HTTP are substituted. Its eight table cases cover missing independent flag, missing base flag, exact/unknown flag, matching modes, missing provider and readiness 404. This test was added after initial policy GREEN. A separate **baseline replay** restored only the production composer from `task-9b-before.snapshot`: **1 test, 1 failure**; current source restored in a `finally` block: **1 test, 0 failures**. This is production-composition regression proof, not a claim that this later test was the initial pre-implementation RED.
9. Existing credential suite now invokes actual JWT local issuance, decode, refresh and old local-status behavior across an explicit policy switch; local contexts reject and normal SMS access remains compatible.

Initial regression runs exposed two expected fixture gaps: old Task4A “production” used a loopback URL/unknown provider, which the approved policy now intentionally refuses; old Task9A rendering fake lacked WordPress `admin_url`/`wp_nonce_field`. Fixtures were made realistic without weakening assertions. An initial isolated build compiled application code but failed on a Node22 hook test type signature under installed Node20 types. The test-only API typing was corrected without dependencies, and the complete isolated build was rerun successfully.

## Final verification

- All **13 standalone PHP suites passed**, supplying the active plugin path to each. This includes Task9B **12/12**, Task9A **20/20**, and all prior auth/credential/admin/provisioning/media/profile suites.
- `php -l` across active-plugin source and WordPress tests: **66 files passed**.
- `tsc --noEmit --incremental false`: **passed**; no active incremental output was written.
- Scoped ESLint across all 13 changed/new TypeScript production/test files: **passed**.
- Complete TSX/alias-loader Node suite: initial full run **300 passed, 0 failed**; final inherited-network-blocker rerun also **300 passed, 0 failed** (267 top-level subtests, 300 total cases).
- Isolated offline Webpack build: **passed**, Next **16.3.0**, application compile, TypeScript, page-data/static generation and traces all complete. Build directory was created with `mktemp` under `$TMPDIR`, copying only source/public and nonsecret project build files; no `.env`, wp-config, runtime data or active `.next` was copied. Installed node_modules were linked. Build used a scrubbed child environment, telemetry off and inherited fail-before-network HTTP/fetch/socket/DNS guards. **The active development `.next` was not used as build output.**
- `git diff --check`: **passed**. Snapshot-based added-line whitespace checks cover external active-plugin changes and new files as well: **passed**.
- Snapshot scope audit: exactly four active-plugin production files changed; **199/217** captured files unchanged, zero UI/gallery/app source changes. Task9A SmsService and Settings validator unchanged; existing raw-secret sanitizer correction remains intact.

Verification logs are scratch artifacts under `$TMPDIR` (`task9b-final-*.log`, `task9b-final-node.log`, `task9b-tsc.log`, `task9b-eslint.log`, `task9b-webpack-final.log`, `task9b-production-baseline-red.log`, `task9b-production-green.log`); the durable source baseline and this report are in the web root.

## Review decisions and remaining controlled real test

Author self-review checked the exact brief against fail-closed classification/authorization, atomic arming, saved-config-only prerequisites, read-only/nonsecret readiness, strict runtime parsing, independent Next opt-in, trusted receipt matching and preserved local credential provenance. **No independent reviewer/subagent was used, per the explicit boundary. Independent review remains required.**

Bounded implementation decisions:

- Use one option containing both mode and arming boolean, rather than two independently saved options, to prevent a partially armed persistence state. Cost if this interface changes: migrate/validate the policy shape deliberately; do not infer an armed mode from partial state.
- Reuse LocalDevelopmentGate as the shared policy rather than introducing a parallel auth gate. Malformed configured installation URLs are conservatively unavailable rather than eligible for production sending. Cost: malformed installations fail closed until operator correction.
- Keep current `local_simulated` provenance checks responsible for old local context invalidation; ordinary SMS tokens are not reclassified or globally revoked. No auth/session rewrite or gallery work is included.

Not performed, and still necessary after source acceptance:

1. Independent review of this delta.
2. Operator privately enters a fresh Faraz API key and approved pattern/sender/variable through the existing masked WordPress settings form; saves configuration. Never provide the key in chat or derive a recipient from current accounts.
3. Operator separately arms local SMS using the new action, exact confirmation and nonce, and independently sets the Next opt-in in their private environment. No such change was made by this task.
4. Check matching backend/Next configuration/schema readiness. Readiness is not balance/account-plan validation or delivery proof.
5. With explicit permission for **one controlled send**, operator enters their own controlled phone in the normal login form, waits for the actual random five-digit message, enters it, and verifies identity/role/session via the normal BFF account GET. Preserve rate/cooldown guards. Do not assume faked provider acceptance proves delivery.
6. If the attempt times out/fails, treat transport acceptance as uncertain; no automatic retry, recipient guessing or rate bypass. Diagnose without exposing provider bodies, keys, full phone or OTP. Disarm and remove the independent opt-in when finished; simulation only resumes if its original gates are valid.

No live acceptance/delivery, private account configuration or actual WordPress admin-save integration claim is made here.
