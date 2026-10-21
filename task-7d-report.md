# Task7D — server-only authenticated account/profile/media BFF

**Status: implemented and offline-verified for the approved frontend source/test scope. Independent controller review is next. Not live WordPress/upload/production readiness, and not Task7E UI completion.**

## Scope and baseline

- Implemented directly by one implementer, without subagents, commits, branch/worktree changes, dependency installation, persistent environment/config changes, or lock-file creation.
- Read the Task7D brief first, the root Task7B final/fix sections and Task7C contract, and installed Next.js 16.3.0 Route Handler/cookie/server-function guidance before implementation.
- Fresh immutable baseline: `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7d-before.snapshot/` — 119 existing source/package/config files plus original git status, captured before implementation. Prior snapshots were not overwritten.
- Snapshot comparison: **24 source/test files changed: 4 existing files modified and 20 new files.** Includes files already untracked at baseline and newly untracked files; not merely `git diff` against HEAD. No baseline source file deleted; all other snapshotted source unchanged.
- `package.json` and `tsconfig.json` are byte-identical to the before snapshot. There was no web-root lock file before or after. No package metadata was changed to suppress Node warnings.
- No UI, account forms, public gallery display, plugin/backend/PHP source, seed, geography, financial/payment, schema/migration, or old-plugin changes. No live HTTP, WordPress bootstrap, auth, upload, DB, SMS, server launch, or network operation was performed. Tests use injected in-memory transports and native Request/Response/File/FormData only. Build used an inherited offline guard.

## Stable browser routes for Task7E

All six route files explicitly use `runtime = "nodejs"`, `dynamic = "force-dynamic"`, and a `server-only` import. Defined handler responses, including errors, use `Cache-Control: private, no-store`, `Pragma: no-cache`, and `Vary: Cookie`. No CORS access-control headers are emitted.

| Browser endpoint | Method/input | Fixed private WordPress operation | Success JSON |
| --- | --- | --- | --- |
| `/api/account/me` | GET | GET `account/me` | `{account: AccountDto}` |
| `/api/account/me` | POST account JSON | POST `account/me`, then authoritative GET `account/me` | `{account: AccountDto}` |
| `/api/profile/me` | GET | owner-account preflight, GET `profile/me` | `{profile: ProfileDto}` |
| `/api/profile/me` | POST profile JSON | owner-account preflight, POST `profile/me` | `{profile: ProfileDto}` |
| `/api/profile/submit` | POST exactly `{}` | owner-account preflight, POST `profile/me/submit` | `{profile: ProfileDto}` |
| `/api/profile/gallery` | POST gallery JSON | owner-account preflight, POST `profile/me/gallery` | `{gallery: GalleryDto}` |
| `/api/profile/gallery/media/[id]` | DELETE strict positive decimal media ID, optional JSON revision | owner-account preflight, DELETE `profile/me/gallery/media/{id}` | `{gallery: GalleryDto}` |
| `/api/profile/media` | GET | GET `uploads` | `{capabilities: MediaCapabilitiesDto}` |
| `/api/profile/media` | POST multipart `file` + `purpose` only | dedicated multipart POST `uploads` | `{media: UploadDto}` |

Namespace is always `nahan/v1`. Installation subpath and pretty/plain permalink selection use the existing validated WordPress URL builder. Query strings are rejected on these BFF routes, including `rest_route`/owner attempts. No request URL, upstream path, owner ID, bearer token, arbitrary fetch options, or proxy target is accepted from browser data. No self-HTTP calls.

Next.js dynamic parameters are awaited as `Promise<{id:string}>`. Unsupported methods remain Next.js framework method handling, not additional BFF operations.

## Browser input contracts

Inputs use the existing backend's snake-case keys; response DTOs use camel case where shown below. Unknown fields reject before session/upstream access.

- Account: `display_name`, `account_city_id`, `avatar_id` only. Name is nonempty plain text, **100 Unicode characters** maximum, matching the installed backend validator. City/avatar are positive safe integers or null to clear.
- Profile: `title`, `bio`, `skills`, `category_ids`, `city_id`, `availability`, `experience_years`, `price_hint`, `address`, `avatar_id` only. Bounds: title 160/nonempty, bio 4000, skills 1000, price hint 200, address 500 Unicode characters; no HTML delimiters, controls, or unpaired surrogates. This includes rejecting newlines, matching the installed backend plain-text rule. Categories: up to 10 unique positive safe integer IDs; `[]` clears. City/avatar: positive safe integer or null. Experience: integer 0–80 or null. Availability: `available|busy|away|''`.
- Submit: empty JSON object only. Does not publish.
- Gallery add: required `media_id`; optional `caption` (300 plain-text Unicode characters), `kind:'image'`, `expected_revision` (nonnegative safe integer). No caller URL or video kind.
- Gallery detach: strict nonzero decimal media-ID path, no leading zeros/exponent/escaping/position interpretation; optional JSON `{expected_revision}`. Absent body becomes `{}` but still passes Origin/Fetch Metadata policy. Detach does not delete an attachment/file.
- Upload: exactly one File under `file` and one string under `purpose`; purpose is `public-avatar|public-portfolio`. Repeated/unexpected fields, `owner`, legacy `context`, private/general purposes, and malformed/empty bodies reject. Portfolio requires specialist role and current owner linkage; client account/avatar operations remain allowed.
- No status, verified, slug, user, role, author, coordinates, contact/consent, or private purpose inputs.

City/category IDs are runtime positive integers, not hardcoded database IDs. Backend taxonomy scope/provenance remains authoritative.

## Runtime output DTOs

The pure production parsers accept `unknown`, enforce exact types/bounds, and construct fresh allowlisted objects; they never spread unknown upstream data into browser results.

- `AccountDto`: `id, displayName, role, loginPhoneMasked, avatar, location, specialist`. Masked phone is null or the backend's `09*****NNNN`, never the raw login phone. Avatar is null or `{id,url,type:'image'}`; location is null or `{id,name,slug}`; specialist is null or `{id,slug,status}`.
- `ProfileDto`: `id,slug,title,status,categories,cities,avatar,bio,skills,address,availability,priceHint,experienceYears,gallery,galleryRevision,galleryAvailable`. Optional `verified` is retained **only when supplied as an actual boolean**; absent remains absent. No fabricated verification value.
- `GalleryDto`: `{gallery:[{id,url,type:'image',caption}],galleryRevision:number|null,galleryAvailable:boolean,status}`. Maximum 20 unique media IDs. Unsupported storage remains unavailable, not fabricated content. `draft|pending|publish` are backend-returned truth, not frontend-predicted transitions.
- `UploadDto`: `{id,url,type:'image',mime,purpose}` only. Returned purpose must match the uploaded purpose. No attachment filesystem paths, thumbnails bag, owner markers, or raw metadata.
- `MediaCapabilitiesDto`: role-bound `purposes,imageMimes,maxBytes,maxDimension,maxPixels,maxFiles,maxGalleryItems,video:{enabled:false,reason:'video_unsupported'},imageDecoderRequired:true`. Capability limits cannot exceed the reviewed backend ceilings; video=true rejects rather than inventing support.

Media URLs must be bounded absolute HTTP(S) URLs with host and no credentials, controls, whitespace, backslashes, or fragments. Invalid DTO identity/type/URL/gallery/limits fail closed. Full phone, email, tokens, OTP tracking, caps, raw usermeta, backend error data/cause, and server paths are not browser fields.

## Authentication, finalization, and cancellation

- Reused the existing coordinator, sealed schema, iron-session v9, generation keys, shared refresh/cancellation coordinator, fixed private WordPress JSON transport, configuration, and error class. No new session store, crypto, JWT decoder, browser auth store, or browser token retrieval API.
- Added internal `SealedAuthCoordinator.authenticatedOperation`. It validates the current sealed shape, access/refresh lifetime, shared cancellation, and current credential/summary fence before gateway use and after resolution/failure. Trusted server composition alone supplies callbacks to private transports; it is not a Server Action or browser-callable API.
- Missing/malformed auth is safe 401; expired access is `refresh_required`. No implicit refresh while rendering, no unconditional refresh-token rotation, and no automatic replay of account/profile/gallery/upload mutations.
- Account POST response identity and role must match the sealed account. A separate authoritative account GET is then validated again, and only its minimized summary is saved in the mutation handler. Credentials and generation remain unchanged. Save failure is not success.
- Existing refresh finalization and account finalization use the **same generation fence**. Overlapping same-session writers fail closed; a distinct stale cookie/response port is rejected rather than writing over rotated credentials or a newer summary. Fences retain the latest private credential/summary fingerprint until refresh expiry, not merely the short refresh replay grace.
- Logout marks that generation cancelled for its credential lifetime, including when no earlier operation created a fence. This prevents delayed old-port reuse after replay grace. Coordination is bounded at 512 live generation fences; admission fails closed rather than evicting active fences. Overflowed cancellation admission blocks affected operation admission until the required lifetime rather than losing cancellation silently.
- Owner preflight rechecks sealed account ID/role, specialist linkage, and returned profile ID/stable slug. Cancellation is checked after preflight **before dispatching the write**, and again after the operation.
- Logout wins the authenticated response even if WordPress already persisted a write. Errors carry `reloadRequired:true` for mutations; no pretend rollback, duplicate upload retry, or optimistic success is emitted.
- The pure real iron-session port updates its current state only after successful cookie save. Read-only ports reject save and never destroy cookies.

### Server Component interfaces

Server-only exports in `profile-bff.server.ts`:

- `readOwnerAccount(): Promise<AccountDto>`
- `readOwnerProfile(): Promise<ProfileDto>`
- `readOwnerMediaCapabilities(): Promise<MediaCapabilitiesDto>`

These use direct private gateways and the same sealed-operation boundary. They never save/destroy cookies, silently refresh, rotate credentials, or call their own HTTP routes. Handler composition is separately obtained with `getProfileRouteHandlers()`.

## Request and multipart limits

- Existing auth JSON limit remains **4096 bytes**, unchanged. Its exact APP_ORIGIN/Fetch Metadata check was extracted and reused, not reimplemented with a weaker policy.
- Account/profile/gallery/submit JSON: **16,384 actual streaming bytes**, with a **15-second body-read timeout**. This is a byte ceiling in addition to individual Unicode field ceilings; maximal multi-byte values across every field need not all fit simultaneously. Content type must be JSON and mutation Origin must exactly match configured APP_ORIGIN; present `Sec-Fetch-Site` must be `same-origin`.
- Multipart file: **1–20,971,520 bytes**. Multipart overhead allowance: **262,144 bytes**. Total inbound stream ceiling before FormData allocation: **21,233,664 bytes**. Content-Length is an early rejection hint only; actual chunks are counted, overflow cancels the reader, and a stalled/aborted input is terminated.
- Only after bounding the complete input does a native platform Request parse FormData from that bounded in-memory buffer. No package parser, file logging, temp-file write, or on-disk staging. Platform-normalized filename is checked for empty/path/control/surrogate content and a **200-byte UTF-8** maximum.
- Local declared MIME/extension shape: JPEG (`jpg|jpeg`), PNG, WebP, GIF only. Video explicitly returns 415 `video_unsupported`. These checks are **not proof of image bytes**; WordPress's real-byte/MIME/dimension/editor policy is final authority.
- Dedicated native upload fetch: fixed POST `uploads`, server Authorization header only, native FormData boundary, `cache:'no-store'`, `credentials:'omit'`, `redirect:'error'`, **30-second timeout including response body**, and **256 KiB maximum response JSON**. Response overflow/timeout/malformed response after a possible write returns 503 `operation_uncertain`, not a claim that nothing persisted. No retry.
- JSON requests continue using the existing private JSON transport and its 10-second timeout; the multipart transport does not alter its serialization/options.
- Errors use static Persian text and a fixed safe code/status allowlist. Useful backend 401/403/404/409/413/415/422 codes are preserved; unknown/raw backend failures become safe 503. No backend message/data/cause is echoed.

**Media is PUBLIC PURPOSE:** normal WordPress upload URLs are public delivery even when an owner profile is draft/pending. Upload does not attach to an avatar/gallery, submit, or publish. Account and specialist avatar changes remain separate explicit writes. Capability MIME lists do not promise installed codec support; WebP/video limitations from Task7C were not changed.

## Actual RED → GREEN evidence

Evidence directory: `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/`.

| RED artifact | Actual observed failure before implementation/fix | Final GREEN coverage |
| --- | --- | --- |
| `task-7d-red-operation.log` | 5 tests failed: sealed operation absent | operation/coordinator tests |
| `task-7d-red-contracts.log` | 3 tests failed: runtime projections/allowlists absent | runtime contract tests |
| `task-7d-red-exact-text.log` | legitimate null masked identifier rejected | exact installed backend text/nullable contract |
| `task-7d-red-request.log` | 4 tests failed: bounded request policy absent | JSON/multipart policy tests |
| `task-7d-red-gateway.log` | 3 tests failed: fixed gateway/upload transport absent | fixed gateway and transport tests |
| `task-7d-red-routes.log` | 6 tests failed: production service/adapter absent | actual pure production route adapters |
| `task-7d-red-session.log` | 2 tests failed: production real iron-session port absent | real seal roundtrip and failed-save state |
| `task-7d-red-preflight-cancel.log` | logout returned 401 but one later profile POST was still dispatched | cancellation after owner preflight prevents dispatch |
| `task-7d-red-query-response.log` | query attempt returned 200; oversized upload response misleadingly returned client 413 | fixed query boundary + ambiguous response 503 |
| `task-7d-red-seal-validation.log` | malformed current session reached operation | schema validation before credential use |
| `task-7d-red-logout-lifetime.log` | old independent port usable after 5-second replay grace | cancellation retained through credential lifetime |

The initial route-test edit had a missing array bracket and was corrected before recording behavioral RED. Fixture fixes during GREEN: a lone surrogate had been normalized by Request's USVString conversion (changed fixture to JSON-escaped surrogate); an assertion expected a Promise rejection from a synchronous validator (wrapped call); the real cookie-store fixture incorrectly returned the same cookie for every chunk name (fixed exact-name lookup). These are not claimed product regressions. Type-check-only fixture annotations were corrected without weakening assertions.

**Final focused command**, exit 0, **46/46 tests** (`task-7d-green-focused.log`):

```sh
node --experimental-strip-types --test src/services/profile/*.test.ts src/services/auth/authenticated-operation.test.ts src/services/auth/auth-session-port.test.ts src/services/auth/auth-coordinator.test.ts src/lib/auth-request-policy.test.ts
```

There are **32 new top-level test cases in 6 new test files**. They test real production parsers, service/adapters, the gateway through the real JSON transport with injected fetch, dedicated upload native fetch with in-memory responses, and the actual iron-session v9 seal/unseal/port. Coverage includes both roles/anonymous, malformed/cancelled/stale seals, identity/role/profile-link mismatch, exact paths/methods/JSON/Bearer headers, Origin/metadata/unknown-key/invalid-ID zero-upstream denials, repeated multipart fields, false Content-Length, streamed overflow/cancellation, body abort/stall/after-headers timeout, public-purpose acceptance, capability video=false, account reread/summary preservation, failed save/no config, distinct response-port refresh/logout races, no ambiguous replay, 409 revision truth, and cookie roundtrip/challenge absence.

## Full offline verification

1. **Full discovered Node suite run once after focused GREEN:** 30 `.test.ts` files found under `src` and `tests`; **230/230 tests PASS**, no failed/cancelled/skipped/todo tests, exit 0. Log `task-7d-full-node.log` records the complete sorted command and discovery count. Command constructed as `node --experimental-strip-types --test` followed by every sorted discovered `.test.ts|.test.mts|.test.js|.test.mjs` path; currently all 30 are `.test.ts`.
2. **`./node_modules/.bin/tsc --noEmit`: exit 0**, `task-7d-tsc.log`.
3. **Scoped ESLint with `--max-warnings=0`: exit 0**, no warnings/errors, `task-7d-eslint.log`. Scope: all `src/services/profile`, the four changed existing auth/policy files, the two new auth tests, and `src/app/api/account` / `src/app/api/profile`.
4. **Next 16.3.0 Webpack production build: exit 0**, `task-7d-webpack.log`. Compiled successfully, TypeScript completed, 10/10 static pages generated; all six new route files appear dynamic in the actual route table. No server launched.

```sh
NODE_OPTIONS="--require=$PWD/.superpowers/sdd/staged-inventing-karp/task-7d-offline-build.cjs" NEXT_TELEMETRY_DISABLED=1 ./node_modules/.bin/next build --webpack
```

The verification-only preload denies fetch, HTTP/HTTPS request/get, socket connects, and DNS before network dispatch and is inherited by workers. No `network is disabled` attempt was reported. It is not application source/config. The build reports its existing `.env.local` filename as Next normally does; no secret/environment values were inspected or printed and no env file changed.

5. **`git diff --check`: exit 0.** Every one of the 24 Task7D source/test files also checked using `git diff --no-index --check /dev/null FILE`: no whitespace diagnostics. Exit 1 for this no-index form only reflects content differences. Snapshot delta and package/config preservation recorded in `task-7d-lint-diff.log`.
6. Review delta: `review-task-7d.diff`, generated against the fresh snapshot, including untracked new files. No PHP regression/lint was run because no PHP changed.

Node emits the existing typeless-package ES-module reparsing warning. This macOS environment also prints system-certificate trust-copy diagnostics (`failed to copy trust settings of system certificate-25291`) in test/build startup. These were not suppressed or falsely reported absent; the commands above still exited 0. ESLint itself is zero-warning.

## Exact source/test file list

Modified existing files:

- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/lib/auth-request-policy.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/auth/auth-coordinator.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/auth/auth-bff.server.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/auth/auth-session-storage.ts`

New fixed handlers:

- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/app/api/account/me/route.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/app/api/profile/me/route.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/app/api/profile/submit/route.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/app/api/profile/gallery/route.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/app/api/profile/gallery/media/[id]/route.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/app/api/profile/media/route.ts`

New production modules:

- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/profile/profile-contracts.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/profile/profile-errors.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/profile/profile-request-policy.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/profile/profile-gateway.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/profile/wordpress-profile-upload.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/profile/profile-service.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/profile/profile-route-adapters.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/profile/profile-bff.server.ts`

New tests:

- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/auth/authenticated-operation.test.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/auth/auth-session-port.test.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/profile/profile-contracts.test.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/profile/profile-request-policy.test.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/profile/profile-gateway.test.ts`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/src/services/profile/profile-route-adapters.test.ts`

Requested report: `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-7d-report.md`. Snapshot/evidence/review delta/preload remain only under the existing task workspace.

## Rulings and remaining integration/activation gaps

1. **Installed backend precision:** focused read-only inspection confirmed account names are limited to 100 characters, masked phone can be null, and backend plain text rejects controls/newlines. Used those actual constraints rather than guessing from the abbreviated report. Cost: multiline text is not admitted until backend contract changes independently.
2. **No query API:** all browser routes reject queries instead of silently accepting proxy/owner hints. Cost: Task7E must send revision in JSON, not URL parameters.
3. **Fail closed on concurrent/stale finalization:** reject a stale/overlapping operation rather than merge from an independent old seal or rotate credentials. Cost: caller may need an explicit refresh/reload after conflict; unsafe mutation retry is not implied.
4. **Shared-coordinator locality:** fencing/cancellation is process/shared-instance scoped, as is the mature existing refresh coordinator. No distributed store was invented. Multi-replica/serverless deployment needs an independently reviewed shared coordination/affinity strategy; process restart loses in-memory fences. This is not a cross-worker/global-transaction or network response-arrival-order guarantee. Old delayed responses are not promised impossible; stale operation admission and authenticated result finalization are what fixtures prove.
5. A backend mutation or uploaded attachment can persist before logout, timeout, malformed response, cookie-save failure, or other partial failure. The response truthfully requires reload; nothing is rolled back or replayed automatically. User-triggered recovery must reread authoritative state and decide explicitly. Upload retry can create duplicates and is not automatic.
6. No operator configuration/activation performed. Existing configured APP_ORIGIN, iron-session password, HTTPS WordPress installation/permalink mode, trusted auth/backend setup, PHP/webserver upload ceilings, image codecs/storage, and single/shared coordinator deployment remain operator prerequisites. Missing configuration fails safely; no secret defaults or config edits were added.
7. Still unproven live: real browser cookies/CSRF across deployment origins, real Next request/cancellation behavior, WordPress auth/role/taxonomy/media ownership, native HTTP multipart provenance, PHP/core upload storage/decoder/thumbnail behavior, actual persistence/reload/two-account negatives, real refresh/logout concurrency across production workers, and delayed Set-Cookie delivery. No fixture/build claim substitutes for those operator-authorized tests.
8. Task7C local codec/video limits remain unchanged. Public-purpose URLs remain public in draft/pending; no private file delivery or public portfolio UI is claimed.

**Next:** controller's independent security/spec review of this exact snapshot delta, followed by separately authorized integration proof and Task7E UI work. No independent review was dispatched by this implementer.
