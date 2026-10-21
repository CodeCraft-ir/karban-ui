# Task 6A fix round 2 — bounded re-review

**Scope:** Re-reviewed only the index-definition finding in `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-6a-fix-1-review.md`, against the active XAMPP plugin source and the current Task 6A/Task 4B fixtures. No live WordPress/bootstrap/database/admin/migration/seed/HTTP/network action or test-suite rerun was performed.

## Verdicts

- **Specification verdict: PASS.**
- **Security/quality verdict: PASS.**

## Required Critical/Important fixes

**NONE.**

## Verification

- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/payments/class-financial-schema.php:87-118` now reads complete `SHOW INDEX` rows and treats an index as compatible only when all of these hold:
  - expected key name;
  - `Non_unique` is exactly `0`;
  - `Sub_part` is explicitly present and `NULL`;
  - positive, unique, contiguous `Seq_in_index` values;
  - exact ordered column sequence (`effect_key`, or `specialist_user_id`, `target_type`, `target_id`).
- The read-only readiness check consumes that strict compatibility state at `:25-35`.
- `/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/includes/payments/class-financial-schema.php:122-137` treats incompatible or unreadable existing index metadata as failure without replacement. It performs duplicate audit/creation only for a genuinely missing key, and re-inspects the just-created key before reporting migration success.
- Version recording remains after both strict index checks at `:54-66`; an incompatible/unreadable same-named index takes the conflict/manual-review path and cannot record successful readiness.
- The registered admin fixture now uses realistic index rows and covers non-unique, wrong-column, wrong-order, prefix, and missing-index states plus the financial upgrade callback: `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-6a-admin.test.php:12-34,117-122`.
- The direct Task 4B migration fixture includes the same-named non-unique-index rejection/no-replacement regression: `/Users/binam/project/پرهیزکاری/karban-uiux/web/tests/wordpress/task-4b-transactional-financial.test.php:55-64,252-255`.

The appended `/Users/binam/project/پرهیزکاری/karban-uiux/web/task-6a-report.md:63-76` records the stated focused GREEN/lint evidence and fixture-only boundary. The named `task-6a-fix-2-before` snapshot was not present under the provided web/project paths during this source-only review; no snapshot was created, changed, or used as a reason to expand scope.
