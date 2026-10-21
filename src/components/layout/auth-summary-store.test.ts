import assert from "node:assert/strict";
import { test } from "node:test";
import type { AccountSummary } from "@/lib/contracts/auth";
import { getLogoutPresentation } from "./auth-summary-view.ts";
import { createAuthSummaryStore } from "./auth-summary-store.ts";

const account: AccountSummary = { id: 88, displayName: "حساب مشترک", role: "client" };

test("invalidates late reads for every subscribed AppShell consumer after shared logout clear", async () => {
  let resolveRead: ((value: AccountSummary) => void) | undefined;
  let logoutCalls = 0;
  const store = createAuthSummaryStore({
    read: () => new Promise<AccountSummary>((resolve) => { resolveRead = resolve; }),
    logout: async () => { logoutCalls += 1; },
  });
  const headerSnapshots: string[] = [];
  const bottomNavSnapshots: string[] = [];
  store.subscribe(() => headerSnapshots.push(JSON.stringify(store.getSnapshot())));
  store.subscribe(() => bottomNavSnapshots.push(JSON.stringify(store.getSnapshot())));

  const readPromise = store.load();
  const logoutPromise = store.logout();
  assert.equal(await logoutPromise, "/");
  resolveRead?.(account);
  await readPromise;

  assert.equal(logoutCalls, 1);
  assert.equal(store.getSnapshot().account, null);
  assert.equal(headerSnapshots.at(-1)?.includes("حساب مشترک"), false);
  assert.equal(bottomNavSnapshots.at(-1)?.includes("حساب مشترک"), false);
});

test("shares duplicate-submit guard and clears all consumers when logout fails", async () => {
  let rejectLogout: ((error: Error) => void) | undefined;
  let logoutCalls = 0;
  const store = createAuthSummaryStore({
    read: async () => account,
    logout: () => {
      logoutCalls += 1;
      return new Promise<void>((_, reject) => { rejectLogout = reject; });
    },
  });
  await store.load();
  const first = store.logout();
  const second = store.logout();
  assert.equal(second, first);
  await Promise.resolve();
  rejectLogout?.(new Error("remote logout unavailable"));
  assert.equal(await first, null);
  assert.equal(logoutCalls, 1);
  assert.deepEqual(store.getSnapshot(), {
    account: null,
    pending: false,
    error: true,
    logoutPending: false,
    logoutError: true,
  });
});

test('mutation/login summary reload broadcasts the authoritative new name and clears prior logout error',async()=>{
 let current=account;const store=createAuthSummaryStore({read:async()=>current,logout:async()=>{throw new Error();}});
 await store.load();await store.logout();current={...account,displayName:'نام تازه'};
 const seen:string[]=[];store.subscribe(()=>seen.push(store.getSnapshot().account?.displayName??''));
 await store.load();assert.equal(store.getSnapshot().logoutError,false);assert.equal(seen.at(-1),'نام تازه');
});
test('a summary reload cannot restore identity during in-flight logout',async()=>{
 let finish!:()=>void;const store=createAuthSummaryStore({read:async()=>account,logout:()=>new Promise<void>(resolve=>{finish=resolve;})});
 await store.load();const out=store.logout();await Promise.resolve();await store.load();
 assert.equal(store.getSnapshot().account,null);finish();await out;
});

test("keeps logout pending and failure presentation visible after account clearing", () => {
  assert.deepEqual(getLogoutPresentation({ account: null, pending: false, error: false, logoutPending: true, logoutError: false }), {
    state: "pending",
    label: "در حال خروج...",
  });
  assert.deepEqual(getLogoutPresentation({ account: null, pending: false, error: true, logoutPending: false, logoutError: true }), {
    state: "error",
    label: "خروج انجام نشد",
  });
});
