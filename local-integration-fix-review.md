# Local WordPress integration fix review

## Verdict

**Approved.** The bounded local-integration change meets the stated permalink, fixed-route, and empty-taxonomy requirements. No concrete Important correctness or security regression was identified in the reviewed scope.

## Review checks

- `WORDPRESS_PERMALINK_MODE` is server-side, defaults to exact `pretty`, and accepts only exact `pretty` or `plain` values; invalid values fail rather than probe or fall back.
- Plain REST construction keeps the internal `nahan/v1` route fixed. It validates the normal relative route before converting it to `index.php?rest_route=...`, preserves ordinary query filters, and retains the existing defenses against raw and PHP-normalized `rest_route` override keys.
- Plain GraphQL construction uses the fixed `index.php?graphql` endpoint while preserving the existing POST transport.
- The taxonomy loader constructs only allowlisted `wp/v2` routes in both modes, retains its server-only/no-credential/no-store/timeout boundary, and returns an actual first-page empty response only when both pagination headers represent zero.
- Pagination now requires both decimal safe-integer headers, bounds page count, checks total/page arithmetic for the fixed `per_page=100`, and rejects changes to either total or page count across later concurrent page fetches.

The supplied report records RED/GREEN coverage for these cases, plus 150 passing Node tests and TypeScript, scoped ESLint, and diff-check success. This was a read-only review: no tests, live network calls, edits, commits, or unrelated public-service/backend work were performed.
