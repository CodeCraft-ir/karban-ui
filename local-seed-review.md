# Local taxonomy seed review

## Verdict

**One Important finding: the implementation does not perform a full read-only manifest preflight before it starts writing.**

`karban_seed_local_taxonomies()` completely validates the manifest's structure, allowed taxonomy set, entry fields, and duplicate names/slugs before its first insert. That is good and is covered by the standalone test. It then processes each entry by doing lookup and insert interleaved. Therefore a later `get_term_by()` error or `wp_insert_term()` failure can occur after earlier terms have been created. The implementation intentionally does not delete those earlier terms, and the documentation honestly discloses this state and safe rerun behavior.

That is non-destructive, but it is not a full manifest preflight in the stronger operational sense: it does not prove all lookups and planned creations can proceed before the first write. If the task requires full preflight, first resolve every entry and build an all-existing/all-would-create plan without writes; only then execute the creation plan. Keep the current no-delete/no-update rule and retain the documented warning for failures/races during the subsequent apply phase.

## Other review results

- **Loopback/path guard:** approved. It accepts only `http`/`https` localhost/loopback hosts, exact `/karban` path, and rejects credentials, query strings, fragments, and other destinations before any taxonomy access or insert.
- **CLI-only runner:** approved. It returns 404 outside `PHP_SAPI === 'cli'`, has an explicit `--apply` opt-in, uses a fixed local `wp-load.php` path, and adds no HTTP endpoint.
- **Credential handling:** approved. The runner relies on WordPress configuration and emits only generic failure text; it does not print configuration values or credentials.
- **Scope and destructive behavior:** approved. The manifest contains only the authorized `job_category` and `city` data. The seeder only looks up or creates terms; it does not delete, rename, update options, posts, or users. Slug/name lookup prevents normal repeat-run duplication and avoids overwriting an existing same-name term.
- **Documentation:** approved aside from the preflight terminology above. It accurately says the CLI bootstrap encountered a database-connection error, actual seeding did not occur, no bypass was attempted, standalone tests are not deployment proof, and a real post-seed verification remains required.
- **Test quality:** approved for the stated boundary. It covers preview no-write behavior, unsafe target rejection before writes, whole-manifest structural validation before writes, initial creation, idempotent repeat, and protection from same-name overwrite. It does not cover the Important mid-run lookup/insert failure case.

No PHP bootstrap, database operation, seed execution, network operation, test execution, source edit, or deployment was performed during this read-only review.
