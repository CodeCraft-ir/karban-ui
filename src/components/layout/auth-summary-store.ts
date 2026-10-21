import { settleLogout } from "../../lib/auth-logout.ts";
import type { AccountSummary } from "../../lib/contracts/auth.ts";

export interface AuthSummaryReader {
  read(): Promise<AccountSummary | null>;
  logout(): Promise<void>;
}

export interface AuthSummarySnapshot {
  account: AccountSummary | null;
  pending: boolean;
  error: boolean;
  logoutPending: boolean;
  logoutError: boolean;
}

export interface AuthSummaryStore {
  getSnapshot: () => AuthSummarySnapshot;
  subscribe: (listener: () => void) => () => void;
  load: () => Promise<void>;
  clearAccount: (failed: boolean) => void;
  logout: () => Promise<"/" | null>;
}

const initialSnapshot: AuthSummarySnapshot = {
  account: null,
  pending: false,
  error: false,
  logoutPending: false,
  logoutError: false,
};

export function createAuthSummaryStore(reader: AuthSummaryReader): AuthSummaryStore {
  let snapshot = initialSnapshot;
  let generation = 0;
  let logoutPromise: Promise<"/" | null> | undefined;
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((listener) => listener());
  const update = (next: AuthSummarySnapshot) => {
    snapshot = next;
    notify();
  };
  const clearAccount = (failed: boolean) => {
    generation += 1;
    update({ ...snapshot, account: null, pending: false, error: failed, logoutError: failed });
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async load() {
      if (snapshot.logoutPending) return;
      const requestGeneration = ++generation;
      update({ ...snapshot, pending: true, error: false });
      try {
        const account = await reader.read();
        if (requestGeneration !== generation) return;
        update({ ...snapshot, account, pending: false, error: false, logoutError: false });
      } catch {
        if (requestGeneration !== generation) return;
        update({ ...snapshot, account: null, pending: false, error: true });
      }
    },
    clearAccount,
    logout() {
      if (logoutPromise) return logoutPromise;
      clearAccount(false);
      update({ ...snapshot, logoutPending: true, logoutError: false });
      const task = Promise.resolve()
        .then(() => reader.logout())
        .then(
          () => {
            const presentation = settleLogout("success");
            update({ ...snapshot, account: null, pending: false, error: false, logoutPending: false, logoutError: presentation.error });
            return presentation.navigateTo;
          },
          () => {
            const presentation = settleLogout("failure");
            update({ ...snapshot, account: null, pending: false, error: true, logoutPending: false, logoutError: presentation.error });
            return presentation.navigateTo;
          },
        )
        .finally(() => {
          logoutPromise = undefined;
        });
      logoutPromise = task;
      return task;
    },
  };
}
