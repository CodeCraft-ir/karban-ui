# Task 7B report — source implementation and verification

> **Current status: fix round 1 implemented and verified locally in source fixtures; awaiting the same independent reviewer's re-review. Source is not accepted yet.** The historical foundation checkpoint and first implementation report below are retained; the appended fix-round section corrects their slug-semantics and owner-query coverage claims. Live integration and the next media slice remain unexecuted.

## Historical account/shared-owner foundation checkpoint

## Scope executed

Implemented the approved Task 7B account/shared-owner backend foundation in the active plugin only:

- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/class-owner-profile.php`
  - shared owner resolver and capability/author/CPT/profile-user-link checks;
  - bounded exact account/profile validation;
  - Kashan seven-city validation with legacy Kashan handling and term provenance checks;
  - checked user/post/meta/term writes and explicit partial-failure errors;
  - stable server-owned slug and verified-state preservation;
  - owner DTO with taxonomy `{id,name,slug}` values;
  - minimal owned, purpose-bound public-avatar media policy;
  - separate minimized account DTO.
- `rest-api/account-routes.php` and `rest-api/bootstrap.php`
  - registered fixed `GET/POST /nahan/v1/account/me`.
- `rest-api/profile-routes.php`
  - routed `GET/POST /profile/me` through the shared service;
  - added explicit `POST /profile/me/submit` (completeness check, pending only);
  - published edits demote to pending;
  - legacy gallery POST/index-delete fail closed with 503 until the hardened provider/revision slice exists.
- `graphql/register-mutations.php`
  - `updateProfile` now uses the shared owner service and rejects unsupported/forbidden fields instead of bypassing ownership and workflow checks.
- `tests/wordpress/task-7b-owner.test.php`
  - standalone registered REST callback and GraphQL binding contract coverage.

Snapshot preserved before editing at:
`/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7b-before.snapshot`

## TDD evidence

- RED: `task-7b-red.log` — account route was not registered.
- GREEN: `task-7b-green.log` — `PASS task7B foundation 117 assertions`.
- RED media boundary: `task-7b-red-gallery.log` — unchecked legacy gallery was not fail-closed.
- GREEN after route closure: `PASS task7B foundation 109 assertions`.
- RED public boundary: `task-7b-next-red.log` — actual public REST callback serialized private address/coordinates and unconsented phone.
- RED write-integrity boundary: `task-7b-red-integrity.log` — actual WordPress escaping contract exposed missing `wp_slash` handling.
- Current foundation test command:
  `/Applications/XAMPP/xamppfiles/bin/php tests/wordpress/task-7b-owner.test.php /Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core`
  Result: `PASS task7B foundation 141 assertions`.

## Regression and lint commands

Ran these PHP regression files against the active plugin, without WordPress bootstrap, DB, HTTP, SMS, upload, or network:

- `task-4a-local-otp.test.php`
- `task-4a2-credential-provenance.test.php`
- `task-6a-admin.test.php`
- `task-7a-seed-tools.test.php` — `Task 7A: 44 passed; 0 failed`
- `task-4b-transactional-financial.test.php`
- `local-taxonomy-seed.test.php`
- `public-profile-guard.test.php`

All exited 0; complete output is in:
`/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7b-regressions.log`.

PHP lint passed for all five changed plugin PHP files and the Task 7B test. Snapshot comparison found five changed plugin files and no other active-plugin PHP changes. `git diff --check` passed. Detailed evidence:
`/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7b-lint-diff.log`.

## DTO and boundary decisions

- Private account DTO does not return full login phone; role, display name, own avatar reference, account location, and specialist linkage are minimized.
- Owner specialist DTO returns editable values, taxonomy IDs/names/slugs, stable slug, publication status, avatar reference, and gallery revision, but does not expose login phone, coordinates, or arbitrary raw gallery.
- Public formatter remains a separate follow-up boundary. Existing public REST `nahan_format_specialist_full()` still includes `address`, `lat`, `lng`, `phone_display`, and raw `gallery`; the actual callback RED test proves this remains unsafe and is intentionally not claimed fixed here.
- Gallery mutations are now unavailable (`503 media_provider_unavailable`) until upload ownership/MIME/purpose and revision-safe gallery persistence are implemented.

## Explicit limitations / remaining blockers

This is a concrete foundation checkpoint, not Task 7B DONE.

1. Registration provisioning in `rest-api/auth-routes.php` is not yet hardened. Current code still does not check `wp_insert_post(..., true)` plus both linkage writes, can issue JWT after incomplete specialist provisioning, and still copies login phone into `phone_display`.
2. Public REST/GraphQL/ACF serialization still needs the separate public formatter and consent-gated named phone policy; no public leakage claim is made.
3. Upload hardening/full gallery provider is not implemented; legacy gallery routes fail closed as required.
4. No live WordPress/HTTP/DB/bootstrap/SMS/upload tests were run.
5. No frontend UI/session/BFF/payment/admin-seed changes were made.
6. No commit, push, dependency, secret, wp-config, migration, or old-plugin-copy changes were made.

The next approved slice should start with the failing public serialization test and registration-provisioning callback RED tests, then implement their shared formatter/provisioning checks without widening into frontend or live integration work.

---

## Final continuation — 2026-10-21

**Status: DONE for the approved Task7B backend source/test scope, pending the controller's independent review.** This is not a claim of live WordPress readiness, working uploads, completed UI/BFF, or completion of the overall seven-slice plan. The historical checkpoint above was resumed rather than restarted; its original snapshot was preserved.

### Completed continuation

1. Added `PublicProfile`, a separate public projection. Public card/detail are restricted to `nahan_specialist`, `publish`, and empty post password. Historical `address`, `location_lat/lng`, `user`, and arbitrary gallery never enter the public DTO. Compatibility keys `address`, `lat`, `lng` remain null and `gallery` remains an empty array. Public avatar resolution uses the owned/public-purpose image policy, not a raw URL fallback.
2. `phone_display` is null unless the existing named phone is a validated ASCII Iranian dialing string AND `public_contact_consent` is explicitly stored as `1`. Missing, false, or other consent values are private. No automatic deletion or consent inference occurs. Registration no longer copies login phone to `phone_display`.
3. GraphQL `location` resolves null; explicit phone/avatar resolvers use the public service; stats and other public specialist fields enforce publication. Public search excludes passwords and rechecks each result; unsupported private-coordinate proximity filtering is rejected. Raw specialist ACF group/fields are not generated in GraphQL, and its REST exposure is explicitly disabled. Generic specialist REST is disabled; generated GraphQL create/update/delete and inherited author/featured-image relations are excluded. Existing wp-admin moderation remains available; no moderation console was added.
4. `AccountProvisioning::ensure` is called by the **actual registered OTP verify callback**, after the existing trusted-context/before-consume readiness path and before JWT issuance. Checked user creation/phone linking/profile creation/both profile links must finish before tokens are issued. `wp_insert_post(..., true)` and zero results are checked. No account or preexisting user is deleted after partial failure.
5. Existing account role is authoritative. Existing specialists missing a profile can create a new draft or recover exactly one safe owned profile. Candidate discovery checks all registered statuses, author and reverse linkage, duplicate profiles, corrupt pointers, competing user claims, and unsupported publication states. Partial backlink repair requires the server provisioning marker; unmarked or contradictory records fail closed. Shared `OwnerProfile::linked_post` is the final linkage invariant used by provisioning and current-owner resolution.
6. Phone-scoped provisioning uses a non-autoloaded fixed-value `add_option` lock and checked release. Duplicate existing phone identities or an occupied lock fail conflict before creating another identity. Deterministic bounded usernames reserve identities whose phone-meta write failed, so retry returns a conflict rather than creating a second account. Crashed locks are not silently stolen.
7. New specialist drafts receive an initial server-owned `specialist-{uid}` slug; profile saves never derive a slug from title or accept slug/status/verified/author/role from the caller. Existing profile publication/slug/verified state is preserved on recovery. Published edits demote to pending before subsequent writes so a partial edit cannot remain published.
8. Owner account DTO now includes a read-only masked login phone (e.g. fixture `09*****6789`), never full login phone. Account location remains separate user metadata from the specialist's service-city taxonomy.
9. Proper WordPress slash contracts are used for user/post/meta writes. Unchanged scalar metadata does not count as failure; invalid requests are fully prevalidated before writes. Write failures return safe 500/503 errors (including explicit `*_write_incomplete` codes), not success or raw database details.

### Exact endpoints / request and return DTOs

Namespace is `nahan/v1`; existing `RestHelper` envelopes are retained (`success/data` or `success:false/error`).

- `GET /account/me`: current legitimate client or specialist role plus corresponding capability; returns `{id,display_name,role,login_phone_masked,avatar,location,specialist}`. `avatar` is null or `{id,url,type}`; `location` is null or `{id,name,slug}`; specialist linkage is null or `{id,slug,status}`. No email, caps, raw usermeta, or full phone.
- `POST /account/me`: **only** `display_name`, `account_city_id`, `avatar_id`; null clears location/avatar. Types are exact, names bounded/nonempty/plain, media strictly owned, city scoped. Any authority/unknown fields reject. Fresh current-user DTO is reread after success.
- `GET /profile/me`: capability `nahan_edit_own_profile` plus valid current-owner pointer/CPT/author/backlink. Returns `{id,slug,title,status,categories,cities,avatar,gallery,gallery_revision,bio,skills,address,availability,price_hint,experience_years}`; taxonomy entries contain IDs/names/slugs. `address` is private owner-only. Gallery remains deliberately unavailable (`[]`) rather than raw historical metadata.
- `POST /profile/me`: only `title,bio,skills,category_ids,city_id,availability,experience_years,price_hint,address`. Bounds: title 160, bio 4000, skills 1000, price hint 200, address 500, max 10 unique category IDs, experience null or integer 0–80; availability `available|busy|away|''`. Category arrays and service city explicitly clear with `[]`/null. Text requires valid UTF-8 and rejects HTML delimiters/control characters. Published edit → pending; draft remains draft; pending remains pending. Never publishes or rewrites slug/verified.
- `POST /profile/me/submit`: empty payload only; current owner, title/bio/category/city completeness and city scope required; transitions to pending only.
- `POST /profile/me/gallery` and legacy index `DELETE /profile/me/gallery/{index}`: shared owner boundary, then **503 `media_provider_unavailable`**. No unchecked acceptance or unstable index deletion.
- GraphQL `updateProfile(input:{input:UpdateProfileInput})`: supported existing camel-case fields map to the exact same shared save service; unsupported/authority arguments reject, coordinates removed from input schema. Existing output remains a Specialist model, with public fields limited as above. It is not an alternate owner/private DTO endpoint.
- Public `GET /specialists` / `GET /specialists/{slug}`: public card/detail only. Public legacy null keys let the existing production parser and JSON-LD consumer remain backward-compatible without frontend edits.

City scope is the seven reviewed historical baseline slugs, no hardcoded DB IDs: `kashan`, `meshkat`, `barzok`, `niasar`, `qamsar`, `jowshaqan-qali`, `kamu-va-chugan`. Present `_nahan_location_county` / `_nahan_location_kind` values must match. Non-Kashan legacy terms need both provenance values. Existing legacy Kashan can be recognized without writing term metadata on GET. No seed/geography data was changed.

### Actual RED → GREEN evidence

Evidence directory:
`/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/`

| RED artifact | Observed failing behavior | Final GREEN |
| --- | --- | --- |
| `task-7b-red.log` | actual account GET route absent | owner callback suite |
| `task-7b-red-gallery.log` | actual legacy gallery callback accepted unchecked references | owner callback suite |
| `task-7b-red-integrity.log` | WordPress unslashing lost literal backslashes | owner callback suite |
| `task-7b-next-red.log` | actual public detail callback emitted private address/coords/unconsented phone | public callback suite |
| `task-7b-red-public-graphql.log` | actual registered GraphQL location resolver disclosed coords | public callback suite plus ACF/CPT registrations |
| `task-7b-red-provisioning.log` | actual public OTP verify callback succeeded after post creation failure | provisioning callback suite |
| `task-7b-red-login-length.log` | registration failed real WP username 60-character constraint | provisioning callback suite |
| `task-7b-red-initial-slug.log` | new draft lacked initial server-owned slug | provisioning callback suite |
| `task-7b-red-masked-phone.log` | account DTO omitted required masked identifier | owner callback suite |
| `task-7b-red-public-stats.log` | GraphQL stats readable on draft | public callback suite |
| `task-7b-red-media-owner.log` | malformed owner marker cast to a valid integer | owner callback suite |

Final `task-7b-green-final.log`:

- **148 assertions** owner/account/profile registered callbacks + GraphQL mutation binding.
- **62 assertions** real public REST detail/list, registered GraphQL field/query resolvers, actual ACF registration and CPT registration configuration.
- **55 assertions** actual registered OTP verify callback, including both roles, creation failures, partial account retained/retry, checked links, invalid owners/statuses, duplicate phone/lock contention, role immutability, and trusted context.
- **All three exit 0.** 265 PHP Task7B assertions total. No helper-only/grep success claim.

### Exact final commands

These commands used absolute active-plugin/web paths, without WP bootstrap or networking:

```sh
phpbin='/Applications/XAMPP/xamppfiles/bin/php'
root='/Users/binam/project/پرهیزکاری/karban-uiux/web'
plugin='/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core'
log="$root/.superpowers/sdd/staged-inventing-karp/task-7b-green-final.log"
: > "$log"
failed=0
for test in task-7b-owner.test.php task-7b-provisioning.test.php; do
 "$phpbin" "$root/tests/wordpress/$test" "$plugin" >> "$log" 2>&1
 result=$?; printf 'EXIT %s\n' "$result" >> "$log"; if [ "$result" -ne 0 ]; then failed=1; fi
done
"$phpbin" "$root/tests/wordpress/task-7b-owner.test.php" "$plugin" --next-public >> "$log" 2>&1
result=$?; printf 'EXIT %s\n' "$result" >> "$log"; if [ "$result" -ne 0 ]; then failed=1; fi
cat "$log"
```

Prior suites were run separately with the same variables:

```sh
log="$root/.superpowers/sdd/staged-inventing-karp/task-7b-regressions.log"
: > "$log"
failed=0
for test in task-4a-local-otp.test.php task-4a2-credential-provenance.test.php task-6a-admin.test.php task-7a-seed-tools.test.php task-4b-transactional-financial.test.php local-taxonomy-seed.test.php public-profile-guard.test.php; do
 printf '\n=== %s ===\n' "$test" >> "$log"
 "$phpbin" "$root/tests/wordpress/$test" "$plugin" >> "$log" 2>&1
 result=$?; printf 'EXIT %s\n' "$result" >> "$log"; if [ "$result" -ne 0 ]; then failed=1; fi
done
cat "$log"
```

All seven exited 0. Task7A remained 44 passed / 0 failed, with no Task7A implementation edits. Auth local gate, trusted OTP before-consume readiness, JWT provenance and role immutability regressions remained passing. Financial/admin/credential tests were fixture tests only, not live operations.

Actual PHP response → existing production parser → existing production JSON-LD composition command (no TS/source changes):

```sh
node --experimental-strip-types --input-type=module > '/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7b-jsonld-green.log' 2>&1 <<'JS'
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const root='/Users/binam/project/پرهیزکاری/karban-uiux/web';
const { parseSpecialistDetail }=await import(pathToFileURL(root+'/src/lib/specialist-adapters.ts'));
const { specialistJsonLd, serializeJsonLd }=await import(pathToFileURL(root+'/src/lib/seo.ts'));
const raw=execFileSync('/Applications/XAMPP/xamppfiles/bin/php',[root+'/tests/wordpress/task-7b-owner.test.php','/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core','--next-public','--emit-dto'],{encoding:'utf8'});
const detail=parseSpecialistDetail(JSON.parse(raw));const schema=specialistJsonLd(detail);const json=serializeJsonLd(schema);
assert.equal(detail.address,null);assert.equal(detail.coordinates,null);assert.equal(detail.phoneDisplay,null);
assert.ok(!json.includes('PRIVATE ADDRESS')&&!json.includes('09123456789')&&!json.includes('33.99'));
assert.ok(!('telephone' in schema)&&!('geo' in schema)&&!('streetAddress' in (schema.address??{})));
console.log('PASS actual PHP public DTO → production parser → JSON-LD (5 privacy assertions)');
JS
```

Result: **PASS, 5 privacy assertions, exit 0**. Node emitted its existing typeless-package ES-module reparsing warning; package metadata was not changed to silence it. No frontend UI, BFF, session, dependency, tsc, or heavy build changes/runs were needed.

Final lint/diff used this exact Python command (and wrote `task-7b-lint-diff.log` / `review-task-7b.diff`):

```sh
python3 -I - <<'PY'
from pathlib import Path
import difflib,subprocess
p=Path('/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core'); w=Path('/Users/binam/project/پرهیزکاری/karban-uiux/web'); d=w/'.superpowers/sdd/staged-inventing-karp'; before=d/'task-7b-before.snapshot'
changed=[];diff=[];log=[]
for f in sorted(p.rglob('*.php')):
 old=before/(str(f.relative_to(p))+'.snapshot');previous=old.read_text() if old.exists() else '';current=f.read_text()
 if previous!=current:
  changed.append(f);diff.extend(difflib.unified_diff(previous.splitlines(True),current.splitlines(True),fromfile=str(old),tofile=str(f)))
(d/'review-task-7b.diff').write_text(''.join(diff))
files=sorted(p.rglob('*.php'))+[w/'tests/wordpress/task-7b-owner.test.php',w/'tests/wordpress/task-7b-provisioning.test.php']
for f in files:
 r=subprocess.run(['/Applications/XAMPP/xamppfiles/bin/php','-l',str(f)],capture_output=True,text=True);log.append(r.stdout+r.stderr);assert r.returncode==0
for f in changed+files[-2:]:
 assert all(line.rstrip(' \t')==line for line in f.read_text().splitlines()),str(f)+' trailing whitespace'
 r=subprocess.run(['git','diff','--no-index','--check','/dev/null',str(f)],capture_output=True,text=True);assert r.returncode in (0,1) and not r.stdout and not r.stderr,r.stdout+r.stderr
r=subprocess.run(['git','-C',str(w),'diff','--check'],capture_output=True,text=True);log.append('git diff --check exit '+str(r.returncode)+'\n'+r.stdout+r.stderr);assert r.returncode==0
log.append('All '+str(len(files))+' PHP files lint clean; '+str(len(changed))+' plugin files differ from preserved snapshot; '+str(len(changed)+2)+' changed implementation/test files have no no-index whitespace diagnostics.\n')
log.append('No-index check exit 1 is content differences, not whitespace failure.\nChanged plugin files:\n'+'\n'.join(map(str,changed))+'\n')
(d/'task-7b-lint-diff.log').write_text(''.join(log));print(''.join(log))
PY
```

Result: **all 53 PHP files lint clean**, 12 plugin files changed from the preserved originals, no other active-plugin PHP originals changed, `git diff --check` exit 0, no no-index whitespace diagnostics for all 14 implementation/test files.

### Exact final implementation/test/report file list

Active plugin only:

- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/class-owner-profile.php` (new)
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/class-public-profile.php` (new)
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/class-account-provisioning.php` (new)
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/rest-api/account-routes.php` (new)
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/rest-api/bootstrap.php`
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/rest-api/profile-routes.php`
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/rest-api/auth-routes.php`
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/graphql/register-mutations.php`
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/graphql/register-queries.php`
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/graphql/register-types.php`
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/acf-fields.php`
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/cpt/class-registrar.php`

Web tests/report:

- `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-7b-owner.test.php`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-7b-provisioning.test.php`
- `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-7b-report.md`

Evidence/diff artifacts are confined to the existing task documentation directory listed above. No frontend source files, original plugin copy, seed/admin/payment/migration code, secrets, wp-config, or dependencies were modified. No commits/subagents were used.

### Staged limitations / required real integration tests

- **Media remains staged.** The unchanged uploader produces legacy `_nahan_uploaded_by` / `_nahan_context`, not trusted `_nahan_media_owner` / `_nahan_media_purpose`. Consequently new avatar assignments from that uploader correctly reject 422 until the hardened producer exists. Only purpose-bound owned image references pass fixture tests. Gallery add/delete deliberately return 503, and no full media/gallery feature is claimed working. Existing upload URLs are not claimed private/protected by DTO filtering.
- Public contact opt-in is a stored trusted flag only; no new public-contact UI or admin flow was introduced. Missing flag hides historical phone metadata. Generated specialist ACF GraphQL fields and generic specialist REST are intentionally unavailable; downstream GraphQL clients must use the explicit safe schema/owner APIs. The present frontend public REST parser requires no change (verified above).
- **Database uniqueness prerequisite remains explicit:** WordPress usermeta does not enforce a globally unique phone identity. This callback serializes its own provisioning with the phone lock and rejects duplicates before/after writes, but global concurrent writers outside this path require an independently reviewed DB uniqueness/identity-claim design before a broader concurrency guarantee. No implicit schema/migration was invented. An interrupted process can leave a fail-closed lock requiring operator inspection/repair; no unsafe TTL stealing was added.
- Failure results may leave earlier validated writes persisted; error codes honestly identify incomplete outcomes. No destructive rollback deletes user data. Phone-meta failure can reserve an orphan username and require operator repair; marked safe profile partials can be retried. This is preferable to issuing credentials for incomplete identities or silently adopting foreign/unmarked records.
- No live WordPress bootstrap, database, migration, activation, account/profile creation, HTTP, GraphQL engine execution, SMS, network, or upload was performed. Tests are registered-callback and schema-registration source fixtures. Live wp-admin publication/classic-editor behavior, actual GraphQL schema exclusion, WP option-lock concurrency/cache behavior, permalink/plain route handling, complete save/reload/login persistence, and two-account negatives must be tested later under operator authorization.
- No UI/session/BFF/payment/financial/admin-seed expansion occurred. Existing unrelated identity-verification/project/messaging modules were not broadly rewritten. Task7A was not reimplemented; only its prior regression was rerun.

---

## Task7B fix round 1 — two Important reviewer findings

**Implemented; not accepted until same-reviewer re-review.** Authority is the coordinator's two verified Important findings from reviewer `a1735a625dd7cb759`. This round changed only the two requested plugin files, the existing owner callback test, and this report/evidence. It did not reopen Task7A or broaden into other modules.

### New preserved snapshot

`/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7b-fix-1-before.snapshot/`

Contains pre-fix copies of both targeted plugin files, owner/provisioning fixtures, and the existing report under `plugin/` and `web/`, all with `.snapshot` suffix. The original `task-7b-before.snapshot` was read only and not overwritten.

### Finding 1 — installed WordPress clears pending slugs

The previous fixture assigned update fields directly and did not model the installed `wp_insert_post()` pending-capability branch. Consequently the prior report's stable-slug claim was not adequately verified for submit/published-edit/already-pending save. Installed source was inspected only at the focused pending-status branch and the `wp_insert_post_data` call in `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-includes/post.php`; WordPress was not executed or bootstrapped.

Fix in `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/class-owner-profile.php`:

- For the already validated owner write transitioning to or remaining pending, capture only that post's existing server-owned slug.
- Register a temporary `wp_insert_post_data` filter at `PHP_INT_MAX` for the duration of that `wp_update_post()` call.
- Match update=true, exact target post ID, specialist CPT, current owner author, and pending status before restoring the captured slug in WordPress's slashed-data format.
- Always remove the exact closure in `finally`, including WP_Error, zero-result, and exception paths.
- No role/capability changes, publish permission grants, caller slug fields, direct database writes, or global slug filters were introduced.

The owner test's write fixture now faithfully clears pending slugs when the current specialist lacks `publish_post`, even when an existing slug was merged or supplied. Actual registered REST submit/save and GraphQL mutation tests cover draft-submit, published edit, already-pending save, later authorized publication retaining the original URL slug, unchanged user capabilities, an unrelated nested pending write, a subsequent unrelated write, failure/exception cleanup, and continued rejection of arbitrary slug input.

**RED:** `task-7b-fix-1-red-slug.log`, exit 255, failed `installed pending capability semantics preserve server slug submit` against the pre-fix source.

**GREEN:** `task-7b-fix-1-green-focused.log` and `task-7b-fix-1-green.log`: **49 pending-slug assertions PASS**.

### Finding 2 — remaining GraphQL owner query bypass

The prior current-caller coverage claim omitted registered `RootQuery.mySpecialistProfile`; it still cast a usermeta pointer and returned any post without the shared capability/CPT/author/backlink validation.

Fix in `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/graphql/register-queries.php`:

- `mySpecialistProfile.resolve` now calls exactly `OwnerProfile::resolve()`.
- A shared resolver error becomes a GraphQL `UserError` containing only its safe error code; no model is returned for invalid ownership. Anonymous/no-profile cases now fail with those explicit errors rather than silently returning null.
- A valid result returns the same Specialist Post model as before. No second owner resolver or casting-based fallback remains in this query.

Actual registered query tests cover missing capability, anonymous caller, malformed pointer, missing post, wrong CPT, foreign author, conflicting reverse user linkage, malformed backlink, missing pointer, administrator without capability, and a valid owned specialist profile. Denials are checked against the shared resolver's exact safe error code.

**RED:** `task-7b-fix-1-red-owner-query.log`, exit 255, failed `registered owner query must reject missing-cap` against the pre-fix source.

**GREEN:** **22 registered owner-query assertions PASS**.

Corrected current-owner caller coverage now explicitly includes: REST owner GET/POST/submit/gallery owner gate, GraphQL `updateProfile` mutation, and GraphQL `mySpecialistProfile` query. This is scoped coverage of these account/profile paths, not a claim that unrelated project/matching/messaging modules were reviewed or rewritten.

### Exact RED / GREEN commands and logs

RED was run after adding the realistic fixture/query tests and before changing either plugin file:

```sh
phpbin='/Applications/XAMPP/xamppfiles/bin/php'; root='/Users/binam/project/پرهیزکاری/karban-uiux/web'; plugin='/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core'
for mode in slug owner-query; do
 "$phpbin" "$root/tests/wordpress/task-7b-owner.test.php" "$plugin" "--fix-$mode" > "$root/.superpowers/sdd/staged-inventing-karp/task-7b-fix-1-red-$mode.log" 2>&1
 code=$?; printf '\n%s EXIT %s\n' "$mode" "$code"
 cat "$root/.superpowers/sdd/staged-inventing-karp/task-7b-fix-1-red-$mode.log"
done
```

The focused GREEN command was:

```sh
log="$root/.superpowers/sdd/staged-inventing-karp/task-7b-fix-1-green-focused.log"
{ "$phpbin" "$root/tests/wordpress/task-7b-owner.test.php" "$plugin" --fix-slug && "$phpbin" "$root/tests/wordpress/task-7b-owner.test.php" "$plugin" --fix-owner-query; } > "$log" 2>&1
code=$?; cat "$log"
```

All focused/new and the prior seven PHP suites were rerun with:

```sh
set +e
phpbin='/Applications/XAMPP/xamppfiles/bin/php'
root='/Users/binam/project/پرهیزکاری/karban-uiux/web'
plugin='/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core'
log="$root/.superpowers/sdd/staged-inventing-karp/task-7b-fix-1-green.log"
: > "$log"
failed=0
for mode in --fix-slug --fix-owner-query --next-public; do
 printf '\n=== task-7b-owner.test.php %s ===\n' "$mode" >> "$log"
 "$phpbin" "$root/tests/wordpress/task-7b-owner.test.php" "$plugin" "$mode" >> "$log" 2>&1
 result=$?; printf 'EXIT %s\n' "$result" >> "$log"; if [ "$result" -ne 0 ]; then failed=1; fi
done
for test in task-7b-owner.test.php task-7b-provisioning.test.php task-4a-local-otp.test.php task-4a2-credential-provenance.test.php task-6a-admin.test.php task-7a-seed-tools.test.php task-4b-transactional-financial.test.php local-taxonomy-seed.test.php public-profile-guard.test.php; do
 printf '\n=== %s ===\n' "$test" >> "$log"
 "$phpbin" "$root/tests/wordpress/$test" "$plugin" >> "$log" 2>&1
 result=$?; printf 'EXIT %s\n' "$result" >> "$log"; if [ "$result" -ne 0 ]; then failed=1; fi
done
cat "$log"
exit "$failed"
```

Results: **49 slug + 22 owner-query + 62 public + 148 foundation + 55 provisioning assertions PASS; all seven prior suites exit 0**, including Task7A 44/0. Total current Task7B PHP assertion count is 336.

The exact PHP DTO → production parser → JSON-LD command from the previous continuation was rerun unchanged except its output file was `task-7b-fix-1-jsonld-green.log`. **5 privacy assertions PASS, exit 0**, with only the same Node typeless-package warning. No frontend source/package changes were made.

All active-plugin PHP plus both Task7B fixtures were linted again by invoking `/Applications/XAMPP/xamppfiles/bin/php -l FILE` for every `*.php` under the active plugin and the two test paths. **All 53 PHP files PASS.** `git -C '/Users/binam/project/پرهیزکاری/karban-uiux/web' diff --check` exited 0. `git diff --no-index --check /dev/null FILE` produced no whitespace diagnostics for the two edited plugin files and owner fixture (exit 1 only reflects content differences).

### Fix-round review artifacts / file list

- Plugin edit: `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/class-owner-profile.php`
- Plugin edit: `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/graphql/register-queries.php`
- Existing test edit: `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-7b-owner.test.php`
- Report append: `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-7b-report.md`
- Focused review diff: `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/review-task-7b-fix-1.diff`
- Combined verification log: `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7b-fix-1-green.log`
- Lint/diff evidence: `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7b-fix-1-lint-diff.log`
- Privacy composition evidence: `/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-7b-fix-1-jsonld-green.log`

The full `review-task-7b.diff` was refreshed read-only against the original Task7B snapshot. Its plugin changed-file set remains the same 12 files; this fix round introduces no additional plugin modules. No live WordPress bootstrap/DB/migration/profile creation/HTTP/network/SMS/upload, configuration/secrets, UI/BFF/media/dependency changes, commits, or subagents occurred. Existing staged media/global-phone-uniqueness/live-integration limitations above are unchanged. The installed WordPress semantic fixture and registered callbacks are verified; actual live behavior and acceptance still require the controller's authorized next stage and the same reviewer's re-review.
