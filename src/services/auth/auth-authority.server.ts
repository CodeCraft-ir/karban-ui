import "server-only";

import { AuthCoordinatorError, createRefreshCoordinator, type RefreshCoordinator } from "./auth-coordinator.ts";

// One application, one persistent Node global/realm ONLY. Not a distributed lock,
// worker registry or restart-persistent revocation store. No request-derived scopes.
const KEY = Symbol.for("karban.web.auth-authority");
// Bump for ANY incompatible coordinator semantics/state/error contract. Compatible
// HMR reuses the original closures; incompatible HMR requires a process restart,
// never a second authority or deletion/replacement of live fences.
const VERSION = "refresh-fences-v1.2026-10-22";
interface Authority {
  version: typeof VERSION;
  instance: string;
  coordinator: RefreshCoordinator;
  error: typeof AuthCoordinatorError;
}
const host = globalThis as typeof globalThis & { [KEY]?: unknown };

function authority(): Authority {
  const descriptor = Object.getOwnPropertyDescriptor(host, KEY);
  if (!descriptor) {
    const value: Authority = Object.freeze({
      version: VERSION,
      instance: crypto.randomUUID(),
      coordinator: Object.freeze(createRefreshCoordinator(() => Date.now())),
      error: AuthCoordinatorError,
    });
    Object.defineProperty(host, KEY, { value, writable: false, configurable: false, enumerable: false });
    return value;
  }
  const value = descriptor.value as Partial<Authority> | undefined;
  if (descriptor.get || descriptor.set || descriptor.writable || descriptor.configurable || descriptor.enumerable ||
    !value || typeof value !== "object" || !Object.isFrozen(value) || value.version !== VERSION ||
    typeof value.instance !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value.instance) ||
    typeof value.error !== "function" || !value.coordinator || !Object.isFrozen(value.coordinator) ||
    !["run", "cancelAndWait", "isCancelled", "claim"].every(key => typeof Object.getOwnPropertyDescriptor(value.coordinator!, key)?.value === "function")) {
    throw new Error("Incompatible auth authority; process restart required");
  }
  return value as Authority;
}

const shared = authority();
// Errors cross independently evaluated source graphs too. Re-home ONLY errors
// produced by this authority's constructor, not arbitrary code/status objects.
function localError(error: unknown): never {
  if (error instanceof shared.error) throw new AuthCoordinatorError(error.code, error.status);
  throw error;
}
function sync<T>(operation: () => T): T { try { return operation(); } catch (error) { return localError(error); } }
async function asyncCall<T>(operation: () => Promise<T>): Promise<T> { try { return await operation(); } catch (error) { return localError(error); } }

/** Local facade, shared reservations/maps/closures; never a fresh authority. */
export const processAuthAuthority = Object.freeze({
  instance: shared.instance,
  coordinator: Object.freeze<RefreshCoordinator>({
    run: (key, operation) => asyncCall(() => shared.coordinator.run(key, async isCancelled => {
      try { return await operation(isCancelled); }
      catch (error) {
        // Singleflight/replay may deliver this callback's rejection to another
        // source graph. Store only authority-owned coordinator error instances.
        if (error instanceof AuthCoordinatorError) throw new shared.error(error.code, error.status);
        throw error;
      }
    })),
    cancelAndWait: (key, expiresAt) => asyncCall(() => shared.coordinator.cancelAndWait(key, expiresAt)),
    isCancelled: key => sync(() => shared.coordinator.isCancelled(key)),
    claim: (key, auth, write, observer) => {
      const lease = sync(() => shared.coordinator.claim(key, auth, write, observer));
      return {
        check: () => sync(() => lease.check()),
        commit: next => sync(() => lease.commit(next)),
        release: () => sync(() => lease.release()),
      };
    },
  }),
});
