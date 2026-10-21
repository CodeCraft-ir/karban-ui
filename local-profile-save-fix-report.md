# Local profile save 422 — offline reproduction and fix

## Status

The routing/payload failure is reproduced and fixed in the active plugin, with offline registered-callback regression coverage. A real authenticated browser save/reread remains for the controller/user; it was not performed or represented as passing here.

No WordPress bootstrap, live DB, HTTP/network requests, session impersonation, OTP, live account/profile write, real upload, configuration/environment-file change, dependency installation, or commit was performed. The production build used the existing offline network-blocking preload. Existing unrelated working changes were not reverted.

## Actual cause and RED evidence

The fixture requires the installed `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-includes/rest-api/class-wp-rest-request.php` directly, without `wp-load.php`, captures the actual active plugin route registrations, calls their real permission/callback functions, and uses the real owner/gallery validation and mutation classes. Only external WordPress functions and persistence are replaced by in-memory fixtures. Synthetic names/IDs are fixture data, not real accounts.

Before the fix, identical valid account JSON (`display_name` and numeric `account_city_id`) produced:

| Endpoint representation | Permalink structure | Account result |
| --- | --- | --- |
| pretty | off | 200 |
| plain (`?rest_route=…`) | off | 200 |
| pretty | on | 200 |
| plain (`?rest_route=…`) | on | **422 `unknown_field`** |

Installed `WP_REST_Request::get_params()` merges query parameters into JSON business input and removes `rest_route` only if `get_option('permalink_structure')` is false (installed core lines 497–500). The actual registered account callback passed that merged map to `OwnerProfile::update_account()`, whose exact-key allowlist rejected `rest_route`. This reproduces the reported configuration's mechanism; it is not a claim to have inspected an authenticated live request's private body.

Initial RED: **11 failures / 96 checks**, including valid account save/clear, professional save, empty submit, gallery add/delete under plain+pretty-enabled. It also proved JSON `rest_route` could be silently removed by core when the structure is off, and a duplicate query business field could disappear behind JSON precedence. Both now remain explicitly rejected instead of being filtered away.

A separate multipart RED after the owner fix returned `unknown_field` instead of reaching file validation under plain+pretty-enabled (1 failure / 100 checks). This established the same issue in `/uploads` without uploading anything.

## Minimal fix and policy

- `RestHelper::mutation_data()` accepts only JSON parameters for owner JSON mutations, or multipart body parameters for the upload producer. It rejects non-array/non-map input and explicitly rejects every query key except fixed core routing metadata `rest_route`.
- Routing metadata is excluded by selecting the correct source, not by deleting arbitrary unknown body keys or allowing arbitrary query forwarding.
- Account and professional save use this body-only map. Submit validates that this map is empty before calling `save([], true)`.
- Gallery add reads JSON only. Gallery delete obtains and validates its ID exclusively from URL path parameters, rejects a body-supplied `media_id`, and combines the validated canonical path ID with JSON mutation fields. Query ID overrides fail before mutation.
- Multipart uploads read form body parameters only; existing strict purpose/file/provenance/image/ownership policies and `$_FILES` behavior are unchanged.
- Owner IDs, role, slug, status, city provenance, unknown fields, text/multiline limits, owner resolution, moderation, and pending-slug preservation are not relaxed. Next Origin and query guards were not changed.
- UI 422 copy now uses safe field-specific allowlisted messages for `invalid_display_name`, `invalid_city`, and `unknown_field`; other 422 codes receive a neutral validation fallback, not a misleading account message about professional categories/multiline text. Raw backend messages/codes are never echoed. Multiline business policy is unchanged.

## Changed files

Active plugin root: `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core`

- `rest-api/class-rest-helper.php`
- `rest-api/account-routes.php`
- `rest-api/profile-routes.php`
- `rest-api/upload-routes.php`

Frontend root: `/Users/binam/project/پرهیزکاری/karban-uiux/web`

- `src/lib/owner-ui.ts`
- `src/lib/owner-ui.test.ts`
- `tests/wordpress/local-profile-save.test.php` (new standalone installed-request regression fixture)
- `tests/wordpress/task-7b-owner.test.php` (legacy request double exposes separate body/query/path sources)
- `tests/wordpress/task-7c-media.test.php` (same source-aware request double; delete helper puts ID in path)

Before-edit copies of every pre-existing edited file are in `/Users/binam/project/پرهیزکاری/karban-uiux/web/local-profile-save-fix-before.snapshot/`, with `.snapshot` leaf suffixes to prevent TypeScript/ESLint from compiling backup files. Scoped before→after patch, including the new fixture: `/Users/binam/project/پرهیزکاری/karban-uiux/web/local-profile-save-fix.patch`.

## Verification

- Installed real `WP_REST_Request` plus registered callbacks: **176 checks PASS**, all four URL/permalink combinations. Includes valid name/city save and GET reread, explicit city/avatar null clearing, profile save, empty submit, gallery add/GET reread/path-ID delete, malicious JSON rejection (including JSON `rest_route`), invalid city/name/type rejection, unsafe query pre-write rejection, and multipart purpose reaching file validation without routing leakage.
- All **11 standalone PHP test files PASS** against the active plugin. Prior owner modes `--fix-slug` (49 assertions), `--fix-owner-query` (22), and `--next-public` (62) also PASS. Owner foundation: 148 assertions; media suite: 237 assertions; provisioning: 55 assertions.
- Changed plugin files: `php -l` PASS.
- Safe UI 422 test observed RED on the old misleading message, then GREEN: focused owner UI **8/8 PASS**.
- Full supported Node suite using the established `.superpowers/sdd/staged-inventing-karp/task-7e-test-loader.mjs`: **264 tests PASS, 0 failures**. Command: `node --import ./.superpowers/sdd/staged-inventing-karp/task-7e-test-loader.mjs --test $(find src -name '*.test.ts' -type f)`.
- Earlier bare `node --test` invocation: **257 PASS, 1 failed test file**, `src/components/sections/owner/owner-render.test.ts`, because bare Node cannot resolve its existing `@/lib` aliases (`ERR_MODULE_NOT_FOUND`). The established loader resolves this; no test was weakened or skipped.
- `node_modules/.bin/tsc --noEmit`: PASS (final rerun).
- Scoped ESLint for `src/lib/owner-ui.ts` and `src/lib/owner-ui.test.ts`: PASS (final rerun).
- Full `npm run lint`: **4 existing errors** in `.superpowers/sdd/staged-inventing-karp/task-7d-offline-build.cjs`: line 6 `@next/next/no-assign-module-variable`; lines 6, 10, 14 `@typescript-eslint/no-require-imports`. Also **8 warnings**, including archived snapshot Header/useState, ProDashboard/displayName, Avatar/no-img-element, auth-session-schema/RegistrationRole, plus current Avatar/no-img-element and auth-session-schema/RegistrationRole. These unrelated files were not modified or silenced.
- Offline production build: PASS, exit 0, using `NODE_OPTIONS="--require=$PWD/.superpowers/sdd/staged-inventing-karp/task-7d-offline-build.cjs" NEXT_TELEMETRY_DISABLED=1 npm run build -- --webpack`. TypeScript finished, all 8 static pages generated, and owner/account/profile routes built. Existing system-certificate trust-copy messages and Node module-type warnings appeared during runs; no dependency/configuration changes were made to suppress them.
- `git diff --check`: PASS. Since several working files are already untracked, the explicit snapshot-based patch is the authoritative scoped diff for review.

## Remaining live-session test

Controller/user must use their own already authenticated local browser session after review. Do not copy tokens/cookies or invent a real account ID/name. Explicitly save a reversible account/profile change using the existing form, confirm success and a subsequent authenticated reread/page reload, then restore that field if appropriate. Verify submit/gallery only with explicit user intent because these can affect moderation/media. Keep the intentionally plain Next endpoint mode and existing permalink structure unchanged during confirmation. The offline tests prove the payload-source fix, not live credentials, cache behavior, or end-to-end browser persistence.

## Required review follow-up: top-level JSON object shape

Independent review identified that core associative JSON parsing represents both `{}` and `[]` as PHP `[]`, and the first helper version rejected only nonempty lists. A new raw-body request factory deliberately avoids the usual `(object)` fixture cast. RED reproduced **5 failures / 176 checks**, including actual `/profile/me/submit` callback changing the fixture to pending for raw `[]`.

Minimal correction: before asking core for the JSON map, reject a non-object top-level `json_decode($request->get_body())`; retain core's existing JSON parameter parsing and all strict editable-field validation. The multipart branch is unchanged. Raw `[]`, `[1]`, `null`, `true`, `42`, and a JSON string now return `422 unknown_field` on account/profile/submit/gallery before any fixture persistence changes. `{}` still succeeds for account/profile/complete-profile submit and reaches the existing required-media `invalid_gallery` policy for gallery.

Final focused result: **176/176 PASS**. All 11 isolated PHP files and the three prior owner modes were rerun and PASS after this correction. Supported full Node suite rerun: **264/264 PASS**. Final TypeScript, scoped lint, PHP helper syntax, and git whitespace checks PASS. The already-passing offline frontend production build preceded this PHP-only follow-up; no frontend code changed after that build. Full lint's unrelated errors/warnings remain as listed above.

Follow-up checkpoint backups: `/Users/binam/project/پرهیزکاری/karban-uiux/web/local-profile-save-fix-1-before.snapshot/`. Narrow review-only correction patch: `/Users/binam/project/پرهیزکاری/karban-uiux/web/local-profile-save-fix-1.patch`. The original overall `local-profile-save-fix.patch` has also been regenerated against the original before-edit snapshot and includes the correction. No live-session confirmation has been performed.
