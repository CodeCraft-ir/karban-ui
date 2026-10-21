# Task 5B fix round 2 review — shared auth summary

## Scope and evidence

Reviewed the updated `task-5b-report.md`, the prior Task 5B review, and the current shared implementation in `src/components/layout/auth-summary-store.ts`, `src/components/layout/useAuthSummary.tsx`, `Header.tsx`, `MobileMenu.tsx`, `BottomNav.tsx`, `Providers.tsx`, plus `auth-summary-store.test.ts`. The supplied focused 14/14, full Node suite, TypeScript, scoped lint, Webpack, and diff-check results were treated as evidence. No tests, live auth, network calls, backend/Task5A inspection, secret inspection, or commits were performed.

## Verdicts

- **Fix-2 verdict: NEEDS FIXES.** Shared generation, duplicate-request protection, and terminal local clearing are implemented correctly, but the shared store clears `account` before exposing the pending/error result, so the production Header and MobileMenu render paths hide logout progress and failure feedback.
- **Overall Task 5B quality verdict: NEEDS FIXES.** The shared-state race from fix round 1 is resolved; one user-visible logout-state regression remains.

## Finding

### Important — shared logout pending/error states are not presented by Header or MobileMenu after account is cleared

**Sources:**

- `src/components/layout/auth-summary-store.ts:44-47,68-83`
- `src/components/layout/Header.tsx:50-58`
- `src/components/layout/MobileMenu.tsx:80`

`AuthSummaryStore.logout()` correctly deduplicates through `logoutPromise`, invalidates in-flight reads through `generation`, and calls `clearAccount(false)` before starting the remote logout. That immediately changes `account` to `null`. The subsequent snapshot does set `logoutPending: true`, and terminal success/failure sets `logoutPending: false`/`logoutError`, but both production components choose their logout presentation only inside the `account` branch:

- Header renders its spinner/account dropdown only when `account` is truthy. Once logout starts, it falls through to the anonymous login link, so the user sees neither “در حال خروج...” nor the failure alert. The `logoutError` alert is nested inside the now-unreachable account dropdown.
- MobileMenu's logout button is also under `account ? ...`; after the initial clear it disappears. Its anonymous footer branch checks `logoutError`, but while pending it does not show `logoutPending`, and after a failure it shows only the generic footer text rather than a clear logout-specific state (the failure text is reachable, but the transition hides the pending state).

Therefore the internal state is safe and the tests prove it, but the required production UI loading/error state is not visible. This also makes a remote failure look like an ordinary anonymous state rather than an explicit failed logout, despite correctly not claiming revocation or navigating home.

**Required fix:** preserve a renderable logout status independently of `account`, or render `logoutPending`/`logoutError` before the account-vs-anonymous branch. Keep the account locally terminally cleared and late-read invalidated, but show an accessible pending status while the request is active and a `role="alert"`/safe Persian failure message after a failed remote logout. Ensure the logout control remains disabled/represented during the pending request and that failure does not navigate or claim remote revocation.

## Confirmed round-two fixes

- `AuthSummaryProvider` creates one AppShell-owned store; Header, MobileMenu, and BottomNav subscribe to the same snapshot.
- `generation` invalidates late `/api/auth/me` reads across all subscribers after logout clear.
- `logoutPromise` shares one in-flight remote call and prevents duplicate logout requests.
- Header now invokes the shared `logout()` handler rather than `refresh()`; success navigates only to fixed `/`, failure stays in place.
- `settleLogout("failure")` produces local anonymous state plus an error flag and no navigation, without false remote-revocation claims.
- No Critical finding identified.

## Required fixes

1. Make shared logout pending and failure states visibly renderable in Header and MobileMenu after `account` is cleared; add/adjust regression coverage for the visible state if the project's UI-test seam supports it.
