# Task 5B fix round 1 review — scoped re-review

## Scope and evidence

Reviewed the updated `task-5b-report.md`, the prior `task-5b-review.md`, and the corrected UI/guards-only diff at `.superpowers/sdd/staged-inventing-karp/review-task-5b-fix-1.diff`. The supplied focused/full-suite, TypeScript, scoped lint, Webpack, and diff-check results were treated as evidence; no tests, live auth, network calls, or build commands were rerun. I inspected only the changed logout/error handling and its production account-summary consumers to resolve one concrete integration doubt.

## Verdicts

- **Fix-1 verdict: NEEDS FIXES.** The two originally reported local issues are fixed in the MobileMenu and OTP paths, but logout invalidation is local to one `useAuthSummary` instance and does not cover the other mounted navigation consumers.
- **Overall Task 5B quality verdict: NEEDS FIXES.** A real stale-auth UI race remains in the production AppShell composition.

## Findings

### Important — logout clearing/in-flight invalidation is scoped to one hook instance, so Header and BottomNav can resurrect stale account UI

**Sources:**

- `src/components/layout/AppShell.tsx:11-16` mounts `Header`, `MobileMenu`, and `BottomNav` together.
- `src/components/layout/Header.tsx:23,35-54` and `src/components/layout/BottomNav.tsx:17` each call `useAuthSummary()` independently.
- `src/components/layout/MobileMenu.tsx:52,143-159` calls `clearAccount(...)` only on the MobileMenu hook instance.
- `src/components/layout/useAuthSummary.ts:14-47` stores `account` and `requestId` in per-instance React state/refs.

The fix correctly prevents duplicate MobileMenu submits and clears that MobileMenu instance on both successful and failed logout. However, `clearAccount()` increments only the `requestId` owned by that one hook instance. Header and BottomNav each have separate `account` state, separate in-flight `/api/auth/me` request, and separate request id. If the MobileMenu logout races with a late successful `/api/auth/me` response in Header or BottomNav, that response still passes its own `isCurrent()` check and restores the authenticated summary. The inverse path is also incomplete: Header's logout still calls only `refresh()` on success and leaves its account untouched on failure (`Header.tsx:35-54`), so it does not get the new terminal local-clear behavior at all. This violates the requested “clear stale account on both outcomes and late `/api/auth/me` invalidation” for the actual shared AppShell, even though the isolated hook behavior is correct.

**Required fix:** make account-summary invalidation/logout state shared across Header, MobileMenu, and BottomNav (for example, one AppShell auth-summary context/store or a shared logout revision/event consumed by every hook). Invalidate every mounted `/api/auth/me` request and clear every local account on both remote success and failure. Update Header to use the same terminal-clear path rather than `refresh()` alone; retain failure presentation without claiming remote revocation.

## Confirmed fixes

- `MobileMenu.tsx:143-159` now has a pending guard, disables the logout control with `aria-busy`, handles non-OK/network failure, clears local account on both outcomes, and navigates home only after successful logout.
- `src/lib/auth-logout.ts` and its tests cover duplicate-submit prevention and success/failure terminal presentations without token/phone fields.
- `OtpForm.tsx:279-281,361-364,480-483` maps malformed challenge/parser/coordinator errors through `mapAuthError`; `invalid_challenge` now produces Persian safe text and is not rendered raw. The added `auth-ui` test covers that mapping.
- No Critical finding identified. No source changes, test reruns, live-auth calls, network calls, dependency changes, or commits were made.

## Required fixes

1. Share logout/account-summary invalidation across all AppShell consumers and route Header logout through the same clear-on-success/failure path.
