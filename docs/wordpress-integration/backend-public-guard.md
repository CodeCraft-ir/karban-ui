# Public specialist publication guard

## Purpose

This patch restricts public specialist endpoints to password-free, published `nahan_specialist` posts. Authenticated owner formatting, payments, contact policy and UI are unchanged.

## Current status — do not apply twice

The source change is **already present** in the active local XAMPP plugin:

`/Applications/XAMPP/xamppfiles/htdocs/karban/wp-content/plugins/karban-core/rest-api/profile-routes.php`

**No patch application is needed for that copy.** Forward `git apply --check` against an already-patched file is expected to fail; that alone does not indicate a broken installation. Do not force application or reverse the patch to make the check pass.

The old project plugin copy and the online WordPress deployment were not changed. The portable patch is for a separate, unpatched target that still matches the pre-change source. Inspect and back up that target first; obtain deployment approval separately. If its source differs, review the changes instead of forcing the patch.

## Original snapshot

The byte-for-byte original of the active local file is preserved at:

`/Users/binam/project/پرهیزکاری/karban-uiux/web/.superpowers/sdd/staged-inventing-karp/task-3a-xampp-plugin-before/profile-routes.php`

Portable patch: [public-profiles.patch](patches/public-profiles.patch).

## Applying to an unpatched target only

From the root of the **separately approved, unpatched target plugin**, first check applicability. This example assumes that the patch remains at the local project path; it does not upload files or connect to a remote server.

```bash
git apply --check -p1 '/Users/binam/project/پرهیزکاری/karban-uiux/web/docs/wordpress-integration/patches/public-profiles.patch'
```

Only after that check passes and the target/backups are confirmed, apply once:

```bash
git apply -p1 '/Users/binam/project/پرهیزکاری/karban-uiux/web/docs/wordpress-integration/patches/public-profiles.patch'
```

Do not run these forward-application commands against the already-modified active XAMPP copy. A failed check requires investigation, not a forced application.

## Resulting behavior

- Public list queries use `post_status => 'publish'` and `has_password => false`.
- Public detail returns the existing `not_found` 404 envelope before recording a view or calling a shared formatter unless the post has the correct type, published status and no password.
- Published, password-free profiles retain existing view recording and formatter behavior.
- Shared formatters and authenticated owner flows are unchanged.

## Verification boundaries

Standalone tests exercise the real registered callbacks using minimal WordPress stubs; PHP syntax checks passed. Patch applicability was checked against disposable copies of the **pre-change** snapshot, not by reapplying to the patched plugin.

The local plugin source has changed, but no database migration, WordPress bootstrap, HTTP detail test, remote upload or online deployment was performed for this change. Runtime behavior through the running WordPress installation remains to be verified; standalone tests are not an end-to-end deployment check.
