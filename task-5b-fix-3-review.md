# Task 5B fix round 3 review — shared logout presentation

## Scope and evidence

Reviewed `task-5b-fix-2-review.md`, the updated `task-5b-report.md`, and the current shared implementation in `auth-summary-store.ts`, `auth-summary-view.ts`, `useAuthSummary.tsx`, `Header.tsx`, `MobileMenu.tsx`, `BottomNav.tsx`, `Providers.tsx`, and `auth-summary-store.test.ts`. The supplied focused 15/15, full Node suite, TypeScript, scoped ESLint, Webpack, and diff-check results were treated as evidence. No tests, live auth, network calls, backend/Task5A inspection, secret inspection, source edits, or commits were performed.

## Verdicts

- **Fix-3 verdict: PASS.** The prior shared logout-presentation finding is resolved.
- **Overall Task 5B quality verdict: PASS.** No Important or Critical finding remains in the reviewed scope.

## Verification

- `AuthSummaryProvider` owns one shared store consumed by Header, MobileMenu, and BottomNav. `generation` is incremented on terminal local clear, so late `/api/auth/me` reads from any consumer are ignored.
- `logoutPromise` is shared and returned for concurrent calls, preventing duplicate remote logout requests. The store clears `account` immediately for terminal local safety, then settles success/failure without falsely claiming remote revocation.
- Header and MobileMenu now derive presentation through `getLogoutPresentation(...)` independently of `account`. With `account: null`, pending still renders an accessible `role="status"`/busy state, and failure still renders a safe accessible `role="alert"` without navigation. Success navigates only to fixed `/`; failed logout stays in place.
- Header and MobileMenu both use the same shared `logout()` handler; controls are disabled while pending. BottomNav receives the same shared snapshot and cannot be repopulated by a late read.
- Regression coverage explicitly checks late-read invalidation, shared subscribers, duplicate-call identity, failed logout clearing, and pending/error presentation with `account: null` (`src/components/layout/auth-summary-store.test.ts:9-69`).
- No raw token/phone/remote error or false revocation claim is introduced by the logout presentation seam.

## Findings

None.

## Required fixes

**NONE.**

No live authentication or OTP call was made, and no test/build rerun was performed because the supplied verification evidence covered this bounded re-review and no concrete doubt remained.
