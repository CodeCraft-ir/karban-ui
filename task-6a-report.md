# Task 6A report — admin local setup/seed path

## Scope and safety

Implemented only in the active plugin at `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core`. The old plugin tree was not changed. No WordPress bootstrap, dbDelta, live database, admin login, HTTP, SMS, payment, dependency install, commit, or seed/migration execution was performed.

The reviewed manifest is static and non-secret: 18 `job_category` entries, city root `kashan` (Kashan only), one `nahan_client`, and three `nahan_specialist` demo accounts/profiles. It contains no password, phone, email, administrator, real identity, verification, rating, review, portfolio, experience, or village-completeness claim.

## Implemented files

- `includes/development/class-local-seed-manifest.php`: versioned, guarded static manifest and hash.
- `includes/development/class-local-seed-service.php`: full preflight preview, term lookup, marker/collision checks, explicit confirmation, idempotent term/account/profile apply, resolved IDs, partial-failure honesty, and scoped outbound-hook suppression.
- `includes/admin/class-local-development-tools.php`: `manage_options` Tools submenu, registered `admin_post` callbacks for preview/apply/schema upgrades, POST + nonce + exact confirmation checks, safe readiness statuses, and no secret output.
- `includes/class-local-development-gate.php`: base local predicate plus explicit default-off `NAHAN_LOCAL_DEV_SEED` gate.
- `includes/class-activator.php`: fresh-install refresh-token schema now uses `CredentialSchema::create_table_sql` so new installs receive reviewed provenance columns without a separate divergent definition.
- `includes/class-plugin.php`: small safe registration wiring for the admin tools.
- `tests/wordpress/task-6a-admin.test.php`: standalone registered-callback/admin boundary test.
- Updated `docs/wordpress-integration/local-seed.md` and `local-development-contract.fa.md` with the actual menu/actions and unchanged not-yet-executed status.

## TDD evidence

RED: the new boundary test initially failed because the new manifest/service/admin classes did not exist; after adding the minimal implementation it failed again on missing test WordPress stubs, which were corrected in the test harness. The prior credential test also correctly failed on its obsolete Task 4A2 assertion that activation must not use `CredentialSchema`; that assertion was updated to require the reviewed schema generator for fresh installs.

GREEN: `task-6a-admin.test.php` passes. It verifies manifest counts/scope, no secret fields, explicit seed gate, zero-write preview, server version/hash, actual admin callback registration, and low-privilege denial with zero writes.

## Tests and lint

Passing focused tests:

- `tests/wordpress/task-6a-admin.test.php`
- `tests/wordpress/local-taxonomy-seed.test.php`
- `tests/wordpress/task-4a-local-otp.test.php`
- `tests/wordpress/task-4a2-credential-provenance.test.php`
- `tests/wordpress/task-4b-transactional-financial.test.php`

PHP lint passes for all changed Task 6A plugin PHP files. No live bootstrap or database action was run.

## Operator follow-up

1. In the operator-owned local configuration, enable `NAHAN_LOCAL_DEVELOPMENT` and (only when ready) `NAHAN_LOCAL_DEV_SEED`; do not send configuration secrets through chat.
2. Open **نهان → توسعهٔ محلی** as an administrator.
3. Review each readiness status and run schema upgrades deliberately, one at a time; investigate engine/conflict failures manually.
4. Generate and inspect the complete preview, then apply only with the exact confirmation after verifying the local destination.
5. Verify the resulting local demo data through the authenticated admin/UI flow. No migration or seed has been executed by this task.

The pre-existing DB_HOST warning/configuration history was not edited by this task, and no exhaustive Kashan village hierarchy is claimed.

## RED

- At the continuation checkpoint, `/Applications/XAMPP/xamppfiles/bin/php tests/wordpress/task-6a-admin.test.php` failed before assertions with `Undefined constant "Nahan\Core\Payments\ARRAY_A"` from `class-financial-schema.php:73`. The standalone fixture omitted WordPress’s `ARRAY_A` constant; production code was not changed for this fixture-only condition.

## GREEN

- The focused standalone boundary test now passes after defining the WordPress fixture constant and exercising the **registered** preview, apply, and upgrade callbacks. It covers POST/capability/nonce denials, disabled and forged-peer gates, exact migration confirmation, preflight registration and malformed-manifest zero-write failures, stored-preview ownership, positive apply, idempotent no-overwrite repeat, structured partial redirect/result, outbound-filter cleanup, and financial conflict/engine/index readiness.
- The prior standalone tests were rerun separately and pass: `local-taxonomy-seed.test.php`, `task-4a-local-otp.test.php`, `task-4a2-credential-provenance.test.php`, and `task-4b-transactional-financial.test.php`.
- PHP lint passes for the focused test and all changed Task 6A plugin files: local gate, manifest, seed service, admin tools, financial schema, activator, and plugin wiring.

## final limitations

- Verification remained source/fixture-only. No WordPress bootstrap, database, `dbDelta`, migration, admin login, live seed, HTTP/network, SMS, payment, configuration/secret, dependency, or commit operation was performed.
- The active plugin directory is not a Git worktree, so its source was inspected and linted directly; the existing `task-6a-fix-1-before` snapshot was not modified.

## RED — fix round 2

- The new realistic `SHOW INDEX` fixture made `tests/wordpress/task-6a-admin.test.php` fail as expected: a same-named non-unique `effect_key` index was reported ready by the former name-only implementation. The direct financial migration regression likewise established that the prior code could record readiness for that incompatible existing index.

## GREEN — fix round 2

- `FinancialSchema` now inspects complete `SHOW INDEX` rows. Readiness requires the exact required key name, `Non_unique = 0`, an explicit non-prefix `Sub_part = NULL`, contiguous `Seq_in_index` values, and the exact ordered columns: `effect_key`; `specialist_user_id, target_type, target_id`.
- A same-named incompatible, unreadable, partial/prefix, wrong-column, or wrong-order index is not ready. Upgrade never replaces that existing index automatically; it takes the existing manual-review `WP_Error`/conflict path and cannot record the financial schema version as successful. A newly created index is re-inspected before readiness is recorded.
- The focused admin fixture now uses realistic `SHOW INDEX` rows and covers valid, non-unique, wrong-column, wrong-order, prefix, missing, and registered financial-upgrade failure cases. The Task 4B fixture has a direct migration regression for same-named non-unique index rejection.
- Fresh standalone tests pass: `task-6a-admin.test.php`, `task-4b-transactional-financial.test.php`, `local-taxonomy-seed.test.php`, `task-4a-local-otp.test.php`, and `task-4a2-credential-provenance.test.php`. PHP lint passes for the financial schema and both updated fixtures; targeted tracked-file diff checking is clean.

## final limitations — fix round 2

- The proof remains fixture/source-only. No WordPress bootstrap, database connection, `dbDelta`, migration, seed, admin login, live HTTP/network, SMS/payment, secret/configuration, dependency, commit, or snapshot operation was performed.
- The active plugin directory is not a Git worktree. The new `task-6a-fix-2-before` snapshot was preserved; the web report and fixtures are untracked in this repository, so ordinary tracked-file Git diff output does not include them.
