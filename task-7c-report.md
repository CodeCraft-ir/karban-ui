# Task7C — public profile media and owned gallery

**Status: implemented and verified in source/standalone fixtures; awaiting controller independent review and later authorized live tests.** Task7B was continued from its reviewed owner/public services, not redeveloped. This report does not claim live uploads, a running GraphQL engine, database persistence, completed frontend/BFF integration, or production readiness.

## Scope and preserved baseline

- Active plugin only: `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core`.
- Frontend workspace changes are PHP tests and task documentation only. No frontend UI, BFF, session, payment, geography/seed, auth/role definitions, configuration, secrets, dependency, migration, or old-plugin changes.
- No WordPress bootstrap, database, actual upload directory write, HTTP, network, SMS, seed, activation, commit, or subagent was used.
- Fresh baseline: `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7c-before.snapshot/`. All existing plugin PHP and standalone PHP fixtures were copied before implementation with `.snapshot` suffixes. It was not overwritten.
- Review diff and evidence directory: `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/`.

## Implemented boundaries

### Upload producer

`ProfileMedia::upload()` uses the existing account-role gate. Public avatars are available to legitimate client/specialist accounts. Portfolio additionally requires the specialist role, its account capability, and the unchanged `OwnerProfile::resolve()` capability/CPT/author/strict pointer/backlink invariant. A client with a stray owner-edit capability and apparent profile linkage still cannot upload or attach portfolio media. No caller owner ID is accepted.

Validation occurs before core persistence:

- Exactly one PHP file entry, named `file`; only the request parameter `purpose` is accepted. Purpose must be `public-avatar` or `public-portfolio`. Missing/general/private/identity/project/message contexts are not accepted. Legacy `context` parameters and authority/unknown fields reject rather than defaulting to general.
- PHP upload error must be `UPLOAD_ERR_OK`; `name`, `type`, and `tmp_name` must be strings and PHP `size`/`error` must be integers. Array/multiple-file shapes reject. Filename maximum 200 bytes, declared MIME string maximum 100 bytes; path separators and filename controls reject.
- Native `is_uploaded_file()` plus readable regular temporary file. Actual `filesize()`, not declared size, must be **1–20,971,520 bytes inclusive**.
- Actual `finfo(FILEINFO_MIME_TYPE)` must agree with the extension and `getimagesize()` image MIME. Allowed extensions are `jpg`, `jpeg`, `png`, `webp`, `gif` (case-insensitive); allowed MIME values are JPEG/PNG/WebP/GIF only. SVG, executable, PDF, arbitrary text, and extension/content mismatch reject.
- Before decoding, width and height must each be **1–8192**, and width × height must be **≤24,000,000 pixels**. A readable WordPress image editor must load the image and return matching dimensions. A recognized header alone is not success.
- **Video is disabled**, with **415 `video_unsupported`** for recognized video MIME or video extensions. No container validator, shell probe, external scanner, or package installation was invented.

Persistence remains WordPress core `media_handle_upload('file', 0, ['post_author' => current_user], ['test_form' => false, 'mimes' => fixed_image_allowlist])`. The producer checks nonzero creation result, attachment CPT/author/MIME, and saved image metadata with bounded dimensions and a nonempty file reference. It then writes and rereads `_nahan_media_owner` and the fixed `_nahan_media_purpose`, with purpose last. Finally it calls the shared attachment consumer policy. Storage/metadata/URL errors and thrown storage-hook exceptions return safe 500 errors with no usable media URL or raw source error/path.

No automatic avatar assignment, gallery insertion, submission, or publication occurs on upload. Core can leave an unattached/partially marked asset after failure; there is no destructive rollback or automatic retry. These are **public-purpose WordPress files**: their normal upload URLs are not protected private delivery, including while a profile is draft/pending. Moderation controls profile projection, not access by somebody who already has a public media URL.

### Shared attachment consumers

`OwnerProfile::image()` remains the single shared policy used by account avatars, specialist avatars, gallery, upload verification, and public REST/GraphQL projections. It validates:

- positive integer attachment ID; strict stored positive owner marker;
- attachment CPT, author matching the expected owner, and `inherit|publish` attachment state;
- exact requested public-purpose marker and allowed image MIME;
- an existing WordPress image URL with HTTP(S) scheme, host, no URL credentials, controls, spaces, or backslashes.

There is no raw URL fallback or unrestricted generic attachment resolution. Stored avatar IDs are validated before conversion, so malformed historical strings such as `30tampered` cannot adopt ID 30. Missing/private/general/foreign/malformed markers remain invalid; no legacy ownership is inferred or repaired.

### Gallery storage and mutations

`ProfileGallery` has a bounded, explicit adapter:

1. Canonical key `_nahan_public_gallery` stores **one serialized metadata value**:
   `{version:1, revision:integer, items:[{media:integer, caption:string, kind:'image'}]}`.
2. If canonical metadata is absent, read the historical REST `gallery` serialized **list of rows**, plus a valid historical `_nahan_gallery_revision` (otherwise initial revision 0).
3. Reads never write. On an explicit successful owner mutation, the canonical envelope is saved and reread; historical keys are left intact. Subsequent reads prefer the canonical value.
4. **ACF repeater counts/subfield storage are not supported or claimed compatible.** A numeric `gallery` count, malformed canonical value, oversized/non-list legacy storage, invalid rows, or duplicates make owner mutation unavailable with 409 `gallery_storage_unavailable`. Valid entries can still be projected read-only; invalid/private/foreign/broken entries are omitted. There is no destructive cleanup, silent adoption, or automatic migration.
5. After canonical creation, later ACF/historical-key edits are not an alternate public-gallery writer. A separately reviewed operator adapter would be required; none was added.

Gallery maximum is **20 unique attachment IDs**. Captions are bounded to **300 Unicode characters**, valid UTF-8 plain text without HTML delimiters/control characters. Kind is derived from validated image media; absent/`image` is accepted as the compatibility input, `video` is not. No caller URL is accepted.

An optional `expected_revision` must be an exact nonnegative integer. Stale revisions return 409; exhausted revisions reject before mutation. Deletion identifies the media ID, never its current position. The legacy positional path is explicitly deprecated (410), even when a revision is supplied. Detach never calls `wp_delete_attachment()` or deletes a file.

Cooperating gallery writers serialize on a fixed-value, non-autoloaded per-profile `add_option` lock. The lock is checked on acquisition/release and never stolen by TTL. Rows and revision are saved together, eliminating a separate revision-write partial state. This is not a global transaction/concurrency guarantee against arbitrary direct metadata/ACF writers; real WordPress option/cache/concurrency behavior is not fixture-proven. A crashed/release-failed lock needs operator inspection, not unsafe automatic deletion.

Before gallery persistence, `OwnerProfile::save([])` performs the reviewed owner/status write. Published profiles demote to pending first; draft stays draft and pending stays pending. The existing narrowly scoped pending-slug filter is reused unchanged. Slug, verified flag, role/caps, and author are not rewritten. Specialist avatar set/clear uses the same save/moderation path. Account avatar is independent user metadata, not an implicit specialist-avatar update. Checked avatar metadata rereads reject silent persistence failure.

Failures return safe errors rather than a success DTO. Earlier validated writes may persist: e.g. a profile may already be pending, or the canonical gallery may have persisted before lock-release failure. No Task7C success action is emitted. Core media-creation hooks are not suppressed or falsely claimed transactional.

## Actual REST and GraphQL interfaces / next BFF contract

Namespace: `nahan/v1`. Existing `RestHelper` envelopes remain `{success:true,data:...}` or `{success:false,error:{code,message}}`.

| Interface | Request / response |
| --- | --- |
| `GET /uploads` | Authenticated account capability DTO: role-bound `purposes`, `image_mimes`, `max_bytes`, `max_dimension`, `max_pixels`, `max_files:1`, `max_gallery_items:20`, `video:{enabled:false,reason:'video_unsupported'}`, `image_decoder_required:true`. `image_mimes` is the allowlist, not a promise every installed codec works. |
| `POST /uploads` | Multipart **`file` + `purpose` only**. Success data `{id,url,type:'image',mime,purpose}`. `url` is the validated WordPress medium image URL (may fall back to the existing original through core), not a raw filesystem path. No old raw `thumbnails` array. |
| `POST /account/me` | Existing `avatar_id:integer|null` uses the shared avatar policy; the other reviewed account fields remain unchanged. Fresh private account DTO on success. |
| `POST /profile/me` | Adds **`avatar_id:integer|null`** to the existing reviewed profile fields. Null clears, owned public-avatar assigns. Fresh owner DTO, pending when editing a published profile. No slug/status/owner/verified input. |
| `GET /profile/me` | Existing owner DTO plus normalized `gallery:[{id,url,type:'image',caption}]`, `gallery_revision:integer|null`, `gallery_available:boolean`. Broken/unsupported storage is unavailable, not fabricated portfolio content. |
| `POST /profile/me/gallery` | JSON `{media_id:integer,caption?:string,kind?:'image',expected_revision?:integer}`. Success `{gallery,gallery_revision,gallery_available:true,status}`. Duplicate:409; max count/invalid media/input:422; stale revision:409. |
| `DELETE /profile/me/gallery/media/{media_id}` | Media ID path plus optional JSON `expected_revision`. Numeric REST path strings are strictly validated then converted; no positional interpretation. Same success DTO; absent ID in gallery:404; stale revision:409. |
| `DELETE /profile/me/gallery/{index}` | Current-owner gate, then **410 `positional_delete_deprecated`**; no mutation. |
| Public `GET /specialists/{slug}` | Public formatter now emits normalized valid gallery entries only on published password-free specialists. Existing detail callback records its existing single view, no extra media/profile view is added. Public formatter/media reads themselves write nothing. |
| GraphQL `UpdateProfileInput.avatarId` | New nullable `Int`, mapped by the actual `updateProfile` mutation to shared `avatar_id` save. Existing authority/unknown-field rejection remains. |
| GraphQL `Specialist.gallery` | Actual explicit `[GalleryItem]` resolver maps the same public policy to `{mediaId,url,thumbnail,caption,kind:'image'}`. `thumbnail` and `url` are the same safe medium URL. Draft/pending/private/passworded profiles yield `[]`, including through the existing owner Post model; private editing still uses owner REST DTO. |
| GraphQL `Specialist.avatarUrl` | Existing explicit resolver continues through `PublicProfile::card()` and the shared avatar consumer; no generic ACF/media relation added. |

The later bounded multipart BFF should forward exactly the approved file/purpose shape and trusted existing authentication, never an owner ID or legacy/general context. It should consume the capability DTO, disable video, preserve safe status/error codes, set/clear avatar separately, and add/remove gallery by media ID with the last observed revision. On 409 or any partial/500 result, reread owner state before deciding to retry; do not blindly retry upload and create duplicates. Only explicit submit requests pending; nothing publishes automatically. **No BFF/session/UI code was changed here.** The present public frontend parser still treats nonempty galleries as unavailable; implementing its display is a later authorized slice, not a feature claimed complete in this task.

## TDD and verification evidence

Evidence paths below are under the absolute evidence directory stated above.

| RED file | Observed failure before its production fix | Final GREEN mode |
| --- | --- | --- |
| `task-7c-red-upload-purpose.log` | Wrong old MIME-based error instead of purpose rejection before persistence | `upload-purpose`: 1 assertion |
| `task-7c-red-upload-valid.log` | Real PNG declared text/plain rejected instead of actual-byte validation | `upload-valid`: 1 assertion |
| `task-7c-red-gallery.log` | Actual registered gallery callback still unavailable; no normalized mutations/revisions/storage adapter | `gallery`: 97 assertions |
| `task-7c-red-bindings.log` | Profile avatar/save schema and explicit GraphQL/public gallery/capability bindings absent | `bindings`: 22 assertions |
| `task-7c-red-integrity.log` | Silent account-avatar write claimed success; raw storage exception escaped; exhausted revision corrupted canonical state | `integrity`: 3 assertions |
| `task-7c-red-capabilities.log` | Client/corrupt linkage advertised unavailable portfolio rights | `edges`: 38 assertions |
| `task-7c-red-role.log` | Client with stray edit capability/link gained portfolio rights | `role-boundary`: 3 assertions |
| `task-7c-red-lock-exceptions.log` | Raw option-hook exceptions escaped lock acquisition/release | `lock-exceptions`: 2 assertions |

The first fixture startup found local GD had no `imagewebp()` encoder; that fixture error was corrected before counting behavioral RED. An initial bindings attempt also encountered the old uploader's unconditional WP include; it was separated into direct binding and actual-byte upload modes and rerun to behavioral failures before production changes. The fixture's top-level `$uid` actor variable was found to alias `$GLOBALS['uid']` during reset; actor iteration was isolated before final assertions. These fixture issues are not claimed as product regressions or live evidence.

Final command, with no WordPress bootstrap:

```sh
phpbin='/Applications/XAMPP/xamppfiles/bin/php'
root='/Users/binam/project/پرهیزکاری/karban-uiux/web'
plugin='/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core'
for mode in upload-purpose upload-valid upload gallery bindings edges integrity role-boundary lock-exceptions all; do
 "$phpbin" "$root/tests/wordpress/task-7c-media.test.php" "$plugin" "$mode"
done
```

`task-7c-green.log`: all modes exit 0; **`all` = 237 assertions PASS** (do not add the repeated mode totals to claim extra independent coverage). Upload-only mode is 72 assertions. Final logs contain no PHP warnings/notices/fatals or FAIL entries.

The fixture registers and invokes the real route definitions, permissions, callbacks, actual GraphQL field/input/mutation/query registrations, and shared production services. Tiny JPEG/PNG/GIF bytes are generated locally with real GD; real `finfo`, `getimagesize`, file size, and GD decode run. Header/pixel-bomb/truncated/invalid inputs and a sparse actual oversized temporary file are local only. The WordPress editor boundary is a GD-backed fixture, not a permissive success stub. WordPress current user, post/meta/option storage, core upload persistence, and detail-view DB boundary are stubbed. Only the test process defines a namespaced `is_uploaded_file()` substitute; production has no parameter/filter/config setter that can bypass PHP upload provenance. Temporary files use `TMPDIR` and are removed on process shutdown.

### Prior suites (run separately)

`task-7c-prior.log` records all exit 0:

- Task7B owner foundation **148**, pending-slug **49**, owner-query **22**, public **62**, provisioning **55** assertions — **336** total.
- `task-4a-local-otp.test.php`
- `task-4a2-credential-provenance.test.php`
- `task-6a-admin.test.php`
- `task-7a-seed-tools.test.php` — **44 passed / 0 failed**
- `task-4b-transactional-financial.test.php`
- `local-taxonomy-seed.test.php`
- `public-profile-guard.test.php`

Each was invoked as `"$phpbin" "$root/tests/wordpress/FILE" "$plugin"`; owner modes additionally used `--fix-slug`, `--fix-owner-query`, `--next-public`.

Only three prior fixture expectations were adapted to the completed media slice: attachment fixture now has its real `inherit` state; foreign gallery media now expects 422 rather than staged-provider 503; unsafe index deletion expects 410 rather than staged-provider 503. Reviewed auth/role/local gate, slug filter, owner-query, public privacy, provisioning, term/post failure, financial, and seed checks were retained.

### Lint / diff

`task-7c-lint-diff.log` records:

- **63 PHP files lint PASS**: every active-plugin PHP file plus every `tests/wordpress/*.php`, each via `php -l FILE`.
- `git -C "$root" diff --check`: exit 0.
- `git diff --no-index --check /dev/null FILE` for all ten changed implementation/test files: no whitespace diagnostics (exit 1 here only indicates file content differs).
- Snapshot comparison: **8 plugin files changed (2 new)** and **2 test files**, no other active-plugin PHP changes.
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/review-task-7c.diff` contains the exact plugin/test delta from the fresh snapshot.

No heavy Node build or frontend lint was needed for this PHP/docs-only slice. No claim is made that unexecuted frontend or live integration tests passed.

## Exact changed implementation/test files

- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/class-profile-media.php` — new
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/class-profile-gallery.php` — new
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/class-owner-profile.php`
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/class-public-profile.php`
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/rest-api/upload-routes.php`
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/rest-api/profile-routes.php`
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/graphql/register-types.php`
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/graphql/register-mutations.php`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-7c-media.test.php` — new
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-7b-owner.test.php` — three fixture/staged-expectation adaptations described above

Task documentation: this report, evidence/diff artifacts, and the existing task workspace `progress.md` continuation only.

## Rulings and unverified live limits

1. Retained the user-supplied dirty workspace/active plugin and immutable snapshot instead of branch/worktree/commit; controller supplies independent review. Cost: rollback/review is file/snapshot based, not an isolated committed branch.
2. Video is fully disabled because no reviewed genuine server probe exists. Cost: no portfolio video until a separately reviewed implementation; no fabricated support.
3. Canonical envelope plus explicit historical REST-row adapter, no ACF repeater compatibility assumption. Cost: unsupported/corrupt historical galleries need operator review, and canonical galleries do not track later ACF edits automatically.
4. Media-only specialist-role check wraps, rather than changes, the reviewed owner resolver. Cost: non-specialist accounts are intentionally denied portfolio operations even if they hold a stray edit capability/link. No auth/role definition was changed.

**Not live-proven:** native HTTP multipart provenance, real core file movement/sanitization/re-encoding/thumbnail creation, PHP/webserver upload limits, WordPress image-editor selection/codec support, WP metadata writes/cache visibility, option-lock crash/concurrency behavior, actual GraphQL schema execution, wp-admin publication, live two-account persistence/reload, or later BFF auth and bounded forwarding. The installed core API was inspected read-only; it was never bootstrapped.

Local XAMPP PHP GD has JPEG/PNG/GIF decode support but **no WebP encoder/decoder and no Imagick**. Positive native-byte fixture results therefore cover JPEG/PNG/GIF. A header-visible tiny WebP fixture is explicitly denied with 415 at the real local decode boundary; no WebP success or live WordPress editor support is claimed. Production allows WebP only when the server WordPress editor actually decodes it. Operator integration tests must validate the intended deployed codec/storage behavior, including malformed/large/animated image handling, before rollout.

Unrelated legacy private verification/project/message consumers were not rewritten. This uploader rejects those private/general purposes; it does not retrofit protected storage or prove old upload URLs private. No automatic publication, fake portfolio, or claim that fixtures prove a live upload is made.
