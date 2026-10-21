# Task 5B report — auth UI and protected pages

## Outcome

- Wired the existing Persian RTL auth UI to the fixed Task 5A BFF endpoints only: request, challenge, verify, me, and logout.
- Login now selects `client` or `specialist` before issuing a request, keeps the phone and role only in transient React context, renders safe challenge metadata, and never puts phone, tracking, OTP, or role intent in a URL or browser storage.
- Verify presentation derives five/six boxes from the safe challenge, submits only `{ code }`, handles pending/error/retry/resend states, and follows only the validated authoritative `redirectTo` (`/dashboard` or `/pro`). The legacy post-verify role route redirects back to login and cannot change privilege.
- Added server page guards using an injected safe-session port and the sealed server session directly (no self-HTTP page calls): anonymous users go to fixed `/auth/login`, matching roles are allowed, and wrong roles go to their fixed home. Dashboard greeting uses only safe `displayName`.
- Header, mobile menu, and bottom navigation now use safe `/api/auth/me` summaries, show account loading/unavailable states, expose role-correct links, and use fixed `/api/auth/logout` with pending/error handling. Zustand identity/wallet state was not changed.

## TDD and verification

- Baseline snapshot: `.superpowers/sdd/staged-inventing-karp/task-5b-before/` (frontend originals, `.snapshot` suffix).
- RED confirmed for new pure auth UI and guard tests before production modules existed.
- Focused auth/UI/route tests: **10/10 passed**.
- Full discovered Node suite: **passed** (all existing Task 5A tests plus new tests; Node emitted only the existing module-type warnings and local certificate-store diagnostics).
- `npm exec tsc -- --noEmit`: passed.
- Scoped ESLint over auth UI/layout/routes: passed.
- Webpack production build: passed; all fixed auth routes and protected pages compiled.
- `git diff --check`: passed.
- Browser preview with placeholder/unconfigured runtime: login rendered with role selection and no OTP was sent; protected verify navigation safely returned to login because no transient flow/session existed. Public backend data remained unavailable as expected. No live auth, OTP, WordPress, network, secrets, dependency install, environment write, or commit was performed.

## Key files

- `src/components/sections/auth/LoginForm.tsx`
- `src/components/sections/auth/OtpForm.tsx`
- `src/components/sections/auth/AuthFlowContext.tsx`
- `src/lib/auth-ui.ts` and `src/lib/auth-ui.test.ts`
- `src/lib/auth-page-guards.ts` and `src/lib/auth-page-guards.test.ts`
- `src/services/auth/auth-page-guards.server.ts`
- `src/components/layout/useAuthSummary.ts` now invalidates in-flight account reads when local logout clears state, so a late `/api/auth/me` response cannot resurrect stale authenticated UI.

## Task 5B fix round 1

- Snapshot: `.superpowers/sdd/staged-inventing-karp/task-5b-fix-1-before/`.
- Added RED/GREEN tests for duplicate logout prevention and terminal local account clearing on both remote success and failure (`src/lib/auth-logout.test.ts`). MobileMenu now disables duplicate logout submits, clears local account state for both outcomes, redirects home only after a successful route response, and does not claim remote revocation on failure.
- Invalid challenge/parser/coordinator failures now map to the safe Persian retry/request-new-code message; raw `invalid_challenge` text is never rendered (`src/lib/auth-ui.test.ts`).
- Full discovered Node suite passed, including the final fix-round tests; `tsc`, scoped ESLint, Webpack production build, and `git diff --check` passed. Local Node module-type and certificate-store diagnostics were non-failing. No live auth/OTP/network/backend/plugin/secrets/env/dependency/commit/subagent work was performed.

## Task 5B fix round 2

- Snapshot: `.superpowers/sdd/staged-inventing-karp/task-5b-fix-2-before/`.
- Added `auth-summary-store` as the single AppShell-owned account-summary/logout source. Header, MobileMenu, and BottomNav now subscribe to the same shared generation and snapshot; a late `/api/auth/me` result from any consumer is rejected after logout invalidation and cannot resurrect the account.
- Header now uses the same fixed shared logout handler as MobileMenu, with global pending/duplicate protection and shared terminal local clearing on both success and failure. Failure keeps the safe error state without claiming remote revocation.
- Multi-consumer regression tests cover late-read rejection, shared subscribers, duplicate logout calls, and failed logout clearing (`src/components/layout/auth-summary-store.test.ts`). Final focused suite passed 14/14; full Node suite, TypeScript, scoped lint, Webpack, and diff check passed. No live auth/OTP/network/backend/plugin/secrets/env/dependency/commit/subagent work was performed.

## Task 5B fix round 3

- Snapshot: `.superpowers/sdd/staged-inventing-karp/task-5b-fix-3-before/`.
- Kept immediate terminal account clearing and generation invalidation, while adding a production logout-status presentation seam used by Header and MobileMenu. Pending and failure states now render independently of the cleared account branch: accessible pending status remains visible during the shared duplicate-protected request, and a safe `role="alert"` failure message remains visible without navigation or remote-revocation claims.
- Added RED/GREEN composition regression coverage for `account: null` with shared `logoutPending`/`logoutError` states (`src/components/layout/auth-summary-store.test.ts`). Final focused suite passed 15/15; full Node suite, TypeScript, scoped ESLint, Webpack production build, and `git diff --check` passed. No live auth/OTP/network/backend/plugin/secrets/env/dependency/commit/subagent work was performed.
