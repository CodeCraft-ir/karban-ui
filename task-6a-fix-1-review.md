# Task 6A fix round 1 — bounded re-review

**Scope:** Re-reviewed only the seven findings in `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-6a-review.md`, using the active XAMPP plugin and the labeled registered-callback fixture. No WordPress/bootstrap/database/admin/migration/seed/HTTP/network action or test-suite rerun was performed.

## Verdicts

- **Specification verdict: FAIL — one Important finding remains.** The new read-only financial readiness check verifies only index names, not that the required indexes are unique and have the required column definitions.
- **Security/quality verdict: FAIL — one Important finding remains.** A database with same-named ordinary/wrong indexes can be reported as ready and its migration can be treated as complete, defeating the duplicate-protection guarantee.

## Remaining Important finding

### Financial readiness and migration cannot distinguish a required unique constraint from any same-named index

- Source: `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/payments/class-financial-schema.php:25-35,87-99`
- `is_ready()` declares the financial schema ready when `has_index()` finds names `effect_key` and `unlock_unique` (lines 33-35). `has_index()` runs `SHOW INDEX ...` but reads only result column `2` (`Key_name`; lines 87-90); it does not verify `Non_unique = 0`, index column order, or the required columns.
- The migration has the same issue: `ensure_unique_index()` returns success as soon as an index with the expected name exists (lines 93-95). Thus an ordinary `KEY effect_key (effect_key)`, or a unique index named `unlock_unique` over the wrong columns, can be accepted as the required constraint. In that state the admin screen reports ready despite the duplicate protection not being present; because an existing version option is also enough for `upgrade()` to return true (lines 60-66), the operator receives a misleading success result.
- The new fixture checks only a missing index name, not a same-named non-unique/wrong-column index: `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-6a-admin.test.php:104`.
- **Required fix:** Replace name-only `has_index()`/`ensure_unique_index()` checks with a read-only index-definition inspector based on `SHOW INDEX` rows. It must require the expected name, `Non_unique = 0`, and the exact ordered columns (`effect_key`; `specialist_user_id, target_type, target_id`). Have `is_ready()` use that inspector and make `upgrade()` return a manual-review error rather than treating an incompatible same-named index as success. Add focused cases for both a non-unique same-named index and a wrong-column unique same-named index.

## Prior findings verified fixed

1. **Local migration gate and exact confirmation:** fixed. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/class-local-development-gate.php:29-36` adds the local-request/loopback predicate; `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/admin/class-local-development-tools.php:54-63` applies it and verifies the exact confirmation before upgrade.
2. **Roles/CPT/full manifest preflight:** fixed. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/development/class-local-seed-service.php:67-138` checks registrations, full manifest shape/counts/profile fields, term name/slug conflicts, account/author/slug collisions, and exact role sets before writes.
3. **Structured partial failures:** fixed. The same service’s `apply()` at `:33-64` returns `status: partial`, completed items, failure point, safe retry guidance, and restores outbound filters in `finally`; the admin callback persists the result and redirects to `partial`, not success, at `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/admin/class-local-development-tools.php:45-51`.
4. **Term-assignment errors:** fixed. `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/development/class-local-seed-service.php:168-179` checks both assignments and converts failures to the structured partial path.
5. **Actual registered callback coverage:** substantially fixed within the requested fixture boundary. `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-6a-admin.test.php:91-104` invokes registered actions and covers capability/nonce/GET, disabled/nonlocal gates, confirmation, preflight failures, preview ownership, successful/idempotent apply, partial result/filter cleanup, and financial engine/missing-index readiness.

No other Critical or Important findings were identified within this strictly limited fix-round scope.
