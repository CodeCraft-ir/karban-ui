# Task 5B review — UI and page guards

## Scope and evidence

Reviewed the Task 5B brief, `task-5b-report.md`, and the authoritative UI/guards-only diff at `.superpowers/sdd/staged-inventing-karp/review-task-5b.diff`. I also inspected the current production source and the BFF route contracts (`src/app/api/auth/*`, `src/services/auth/auth-route-adapters.ts`, `src/services/auth/auth-coordinator.ts`, and `src/lib/auth-request-policy.ts`). Task 5A backend/BFF implementation files were not reviewed as changed code except where needed to validate the UI contract. No live authentication or OTP request was made, and no edits other than this report were made.

## Verdicts

- **Spec verdict: NEEDS FIXES.** The core login/OTP flow and server guards are substantially wired correctly, but the mobile-menu logout path does not satisfy the required pending/error handling and does not reliably clear the client account state on failure.
- **Quality verdict: NEEDS FIXES.** One concrete production interaction defect remains in the shared mobile navigation. The rest of the inspected auth flow has safe request shapes, fixed redirects, transient flow state, and no client token storage.

## Findings

### Important — Mobile-menu logout has no pending/error state and leaves stale account UI on failure

**Source:** `src/components/layout/MobileMenu.tsx:24,56-63,81`

`logout()` performs a fetch with no `try/catch`, no pending guard, and no disabled state. A rejected fetch becomes an unhandled rejected promise because the caller uses `void logout()`. For a non-OK response it silently does nothing: it neither displays an error nor calls `refresh()`, so the menu continues to show the authenticated account and the logout action remains available. This directly violates the brief's requirement that navigation/logout expose loading/pending/error states and clear account state on logout. It also permits duplicate logout submissions while the first request is in flight.

**Required fix:** add local `logoutPending`/`logoutError` state (or a shared logout helper), guard duplicate submissions, disable the button and expose a status while pending, catch network/non-OK failures with an accessible alert, and on a successful fixed `/api/auth/logout` response call `refresh()`, close the menu, and navigate to `/`.

### Important — malformed challenge responses leak an internal parser error into the OTP UI

**Source:** `src/components/sections/auth/OtpForm.tsx:64-72`

The challenge fetch catch handler renders `cause.message` for every `Error`. If the BFF returns a malformed challenge, `parseAuthChallenge()` throws `Error("invalid_challenge")`, and that internal code is shown directly to the user instead of being mapped to the generic safe unavailable/error message. The normal HTTP error path is mapped safely, but this parser-failure path is not.

**Required fix:** only surface the known user-safe `mapAuthError(...)` messages; map parser failures (including `invalid_challenge`) to the generic unavailable/invalid-response message rather than rendering `Error.message`.

## Positive checks

- Login selects `client`/`specialist` before request and sends only `{ phone, role }` from transient React context; no phone, role intent, OTP, token, or tracking data is put in URLs or browser storage.
- OTP boxes are derived from the safe challenge's 5/6 `codeLength`; verify sends only `{ code }`; challenge expiry is authoritative; resend uses the transient phone/role and has a pending guard.
- Verify accepts only the BFF's validated fixed `/dashboard` or `/pro` redirect, and `parseAuthResult` checks redirect/role consistency. The legacy select-role route redirects to `/auth/login` and cannot mutate privilege.
- Protected pages use the server-only sealed-session helper directly, with fixed redirects and no self-HTTP or user-controlled return path. Dashboard/pro pages receive only safe `displayName`/role-derived authorization.
- Header and bottom navigation use safe `/api/auth/me` projections; identity is not added to Zustand; header logout has pending/error handling; responses are no-store through the route adapter.
- The inspected BFF contract normalizes Persian OTP digits server-side, so the client’s digit handling does not bypass verification semantics.

## Required fixes

1. Fix MobileMenu logout pending/error/clear behavior as described above.
2. Map malformed challenge parser failures to a safe user-facing error in `OtpForm`.

No Critical finding was identified. No test rerun, live-auth check, network call, secret inspection, dependency change, or commit was performed per the bounded review instructions.
