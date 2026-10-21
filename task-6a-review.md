# Task 6A bounded review

**Scope:** Source-only review of the active plugin at `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core` and its labeled frontend test. No WordPress/bootstrap/database/admin/migration/seed execution or suite rerun was performed.

## Verdicts

- **Specification verdict: FAIL.** The admin migration path does not apply the required local-development gate or a handler-verified exact confirmation, and the seed preflight does not establish the required role/CPT readiness before writes.
- **Quality/security verdict: FAIL.** Partial failures are not returned honestly, existing accounts with extra roles are accepted, term-assignment failures can be reported as success, and the labeled test does not exercise the required action boundaries or mutation failure cases.

## Findings

### Critical

1. **Schema upgrades are executable by any `manage_options` administrator on a non-local installation, without an operator-supplied exact confirmation.**
   - Source: `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/admin/class-local-development-tools.php:53-58,62-63`
   - `handle_upgrade()` calls the selected `upgrade()` immediately after the capability/POST/nonce check. It neither calls `LocalDevelopmentGate::is_local_development_enabled()` nor verifies `$_POST['confirmation']`.
   - The UI’s hidden `confirmation` field at `:39` is not a confirmation control and is never checked by the handler.
   - **Required fix:** Gate every migration action with the shared base local gate (and its actual loopback request predicate where applicable); require and compare an operator-entered exact confirmation in `handle_upgrade()` before calling an upgrade; reject before any migration write when either condition fails. Keep the nonce and capability checks.

2. **Seed preflight does not prove that the required roles and specialist CPT are registered, so apply can create data after an incomplete preflight.**
   - Source: `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/development/class-local-seed-service.php:55-79,82-99,124-143`
   - `lookup_plan()` validates only taxonomies, terms, marker queries, and posts queried by a string post type. It never checks `get_role()` for `nahan_client`/`nahan_specialist` or `post_type_exists('nahan_specialist')` before `wp_insert_user()`/`wp_insert_post()`.
   - `validate_manifest()` also has no rejecting branch for malformed profile data: line `:97` merely `continue`s when a profile is invalid/non-specialist or when its bio has the required label; otherwise the loop simply ends. It does not validate profile seed key, slug, title, city/category, uniqueness, or the required one-client/three-specialist distribution.
   - **Required fix:** Make preflight reject unless both required roles and the CPT are registered, and fully validate the approved immutable manifest shape/counts/profile fields before any write. Add tests proving missing role/CPT and malformed/duplicate profile inputs produce zero writes.

### Important

3. **A partial apply failure loses the precise result required for safe recovery.**
   - Source: `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/development/class-local-seed-service.php:38-51`; `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/admin/class-local-development-tools.php:45-50`
   - `apply()` accumulates `$written`, but an exception from a later term, user, or profile only reaches `finally`; it is then rethrown. The caller does not catch it or persist/display the completed items, failure point, or retry guidance. Therefore inserts made before the failure are not honestly reported.
   - **Required fix:** Catch per-operation failures after restoring outbound hooks, return/persist a structured failed/partial result with completed items and safe retry guidance, and ensure the UI never redirects to a success state for a failed/partial run.

4. **An existing marked account with extra roles is accepted instead of treated as a conflict.**
   - Source: `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/development/class-local-seed-service.php:117-122`
   - The code rejects only a missing desired role or `administrator`. A marked account with the desired role plus `editor`, `author`, or another unexpected/privileged role is returned as `existing`, contrary to the required extra/privileged-role conflict rule.
   - **Required fix:** Require an exact allowed role set for a matched seed account (normally exactly its manifest role), and stop with a conflict for every extra or privileged role.

5. **Profile term assignment failures are ignored and can be reported as a successful created profile.**
   - Source: `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/development/class-local-seed-service.php:140-144`
   - Neither `wp_set_object_terms()` result is checked. A `WP_Error` or otherwise failed assignment leaves a published profile without its approved city/category while `apply()` records it as created and returns success.
   - **Required fix:** Check both term-assignment results, convert an error to a structured partial failure, and prevent a successful apply result when required assignments did not complete.

6. **The financial readiness indicator does not verify the current engine or duplicate-index readiness.**
   - Source: `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/admin/class-local-development-tools.php:60-61`; `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/payments/class-financial-schema.php:53-83`
   - The screen labels financial readiness as engine/conflict readiness but only reads a conflict option and a stored version. The actual engine/index checks live only inside private migration helpers; a stale version option can show ready even if tables are now non-InnoDB or required indexes are absent.
   - **Required fix:** Expose a non-mutating `FinancialSchema::is_ready()` that verifies every required table engine and required unique indexes/conflict condition, and use it for the screen status.

7. **The claimed focused boundary test omits the required security and data-integrity coverage.**
   - Source: `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-6a-admin.test.php:13-39,68-79`
   - The test has no implementations/stubs for apply writes or outbound filters and only invokes `handle_preview()` with no capability. It does not execute or assert valid/invalid nonce, GET denial, disabled/nonlocal/forged-host zero writes, preview full-conflict zero writes, apply/repeat/collision behavior, partial failures, outbound cleanup, migration engine/conflict/result behavior, or activator schema parity.
   - It also changes `$GLOBALS['request_method']` at `:77`, while production reads `$_SERVER['REQUEST_METHOD']` at the admin handler source `:63`; consequently it cannot establish the claimed method boundary.
   - **Required fix:** Add strict standalone boundary tests using actual registered callbacks and realistic stubs for every acceptance case above, including positive apply plus idempotent repeat and each failure path. Do not claim those cases are GREEN until they are covered.

## Checks that are correctly present in the reviewed source

- The plugin bootstrap/autoloader does register the admin tool callback path: `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/nahan-core.php:27-38`, `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/class-plugin.php:81-89`, and `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/admin/class-local-development-tools.php:25-29`.
- There is no Task 6A public REST/import registration in the reviewed wiring.
- Seed apply re-runs preflight and compares server-held version/hash; the seed gate is explicit/default-off and loopback-aware; outbound WordPress mail/HTTP filters are installed only around apply and removed in `finally`.
- Fresh-install refresh-token SQL reuses `CredentialSchema::create_table_sql()` in `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/class-activator.php:30-34`.

No other Critical or Important findings were identified within the requested Task 6A integration boundary.
