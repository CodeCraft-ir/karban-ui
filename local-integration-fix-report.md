# Local WordPress integration fix report

## Scope

This bounded fix adds an explicit server-side WordPress permalink mode and accepts the verified local WordPress core-taxonomy empty result without weakening request guards, credentials policy, cache policy, or error mapping. No live authentication, profile detail, payment, database, plugin, UI, or `.env` operation was run.

## Snapshot

A pre-edit snapshot was created at `local-integration-fix-before/`. TypeScript source snapshots use the `.ts.snapshot` suffix so the repository's `**/*.ts` TypeScript include does not compile archival copies. The snapshot directory did not exist before creation, so nothing was overwritten.

## TDD evidence

### RED

Command:

```bash
node --experimental-strip-types --test src/services/wordpress/url.test.ts src/services/wordpress/client.test.ts src/services/wordpress/taxonomies.test.ts
```

Before production changes it exited `1`: `48` tests ran, `43` passed, and `5` failed. The failures were the expected missing mode export, pretty REST URL where the plain URL was required, rejection of `X-WP-TotalPages: 0` plus `[]`, acceptance of inconsistent/malformed pagination headers, and the core-taxonomy pretty URL where the fixed plain URL was required.

### GREEN

The same scoped command exited `0` after the implementation: `52` tests passed, `0` failed.

Full Node suite:

```bash
find src -type f -name '*.test.ts' -print0 | xargs -0 node --experimental-strip-types --test
```

Result: `150` tests passed, `0` failed, exit `0`.

Additional verification:

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint src/services/wordpress/config.ts src/services/wordpress/rest-client.ts src/services/wordpress/graphql-client.ts src/services/wordpress/taxonomies.ts src/services/wordpress/url.test.ts src/services/wordpress/client.test.ts src/services/wordpress/taxonomies.test.ts
git diff --check
```

All exited `0`.

The Node test runner continues to print pre-existing module-type and local certificate-trust warnings; they did not produce test failures.

## Exported APIs and environment semantics

`src/services/wordpress/config.ts` now exports:

- `WORDPRESS_PERMALINK_MODE_ENV` (`"WORDPRESS_PERMALINK_MODE"`)
- `WordPressPermalinkMode` (`"pretty" | "plain"`)
- `getWordPressPermalinkMode()`

`WORDPRESS_PERMALINK_MODE` is server-only because it is not prefixed `NEXT_PUBLIC_`. If it is absent, `getWordPressPermalinkMode()` returns `"pretty"`. Only the exact values `pretty` and `plain` are accepted; an empty, padded, case-changed, or other value throws. There is no automatic endpoint probing or fallback.

Existing URL APIs retain their names and select the mode at call time:

- `getWordPressRestBaseUrl()` keeps `/wp-json/nahan/v1/` in `pretty` mode and returns `/index.php?rest_route=%2Fnahan%2Fv1%2F` in `plain` mode.
- `getWordPressGraphqlEndpoint()` keeps `/graphql` in `pretty` mode and returns `/index.php?graphql` in `plain` mode. The existing GraphQL POST JSON client is unchanged.
- `buildWordPressRestUrl()` first validates its internal relative `nahan/v1` path and rejects all existing absolute, traversal, fragment, and PHP-normalized `rest_route` variants before dispatch. In `plain` mode it creates the fixed `/index.php?rest_route=/nahan/v1/...` URL itself and then appends validated ordinary filters; caller-provided `rest_route` cannot override it.
- `loadPublicTerms()` remains the public taxonomy API. It uses its existing allowlisted `wp/v2` taxonomy paths and creates fixed `/index.php?rest_route=/wp/v2/<known-taxonomy>` URLs in `plain` mode.

## Pagination behavior

For core taxonomies, both `X-WP-Total` and `X-WP-TotalPages` must be present, decimal safe integers, and consistent with the fixed `per_page=100` request. `X-WP-TotalPages=0` is allowed only for page 1 with an empty array and `X-WP-Total=0`; nonempty zero-page payloads, malformed/missing headers, impossible total/page combinations, and inconsistent later-page headers fail with the established `invalid_public_contract` error. The zero-page branch returns before allocating the remaining-pages array.

## Controller handoff

For the controller's native preview only, configure:

```dotenv
WORDPRESS_URL=http://localhost/karban/
WORDPRESS_PERMALINK_MODE=plain
```

Then use only read-only public pages. The existing launch configuration and `tests/integration/local-wordpress-smoke.mjs` were not changed.
