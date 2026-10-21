import assert from "node:assert/strict";
import { test } from "node:test";
import { getIronSession, type CookieStore } from "iron-session";
import * as storage from "./auth-session-storage.ts";
import { parseSealedAuthSession } from "./auth-session-schema.ts";
import type { AuthSessionData } from "./auth-coordinator.ts";
const initial:AuthSessionData={sessionId:"9aa0a1b2-c3d4-4e5f-8a90-b1c2d3e4f5a6",version:1,auth:{accessToken:"private-access",refreshToken:"private-refresh",accessExpiresAt:Date.now()+90_000,refreshExpiresAt:Date.now()+900_000,generation:"84e86fd2-2205-4880-a65c-4b8da64489f1",account:{id:47,displayName:"نام",role:"specialist"}}};

test("real iron-session production port roundtrip replaces summary, preserves private credentials and never reintroduces a challenge",async()=>{
  assert.equal(typeof storage.createIronSessionPort,"function","production iron-session port missing");
  let cookie="";let writes=0;
  const store:CookieStore={get:(name)=>name==="test-auth"&&cookie?{name:"test-auth",value:cookie}:undefined,getAll:()=>[],set:(_name,value)=>{cookie=value;writes++;}};
  const options={cookieName:"test-auth",password:"test-only-not-a-deployment-secret".repeat(2),cookieOptions:{httpOnly:true,sameSite:"lax" as const,path:"/",secure:false}};
  const session=await getIronSession<AuthSessionData>(store,options);
  const port=storage.createIronSessionPort(session,undefined,false);
  await port.save(initial);
  const next={...initial,auth:{...initial.auth!,account:{...initial.auth!.account,displayName:"تازه"}}};
  await port.save(next);
  const reread=await getIronSession<AuthSessionData>(store,options);
  assert.deepEqual(parseSealedAuthSession(reread,Date.now()),next);
  assert.equal("challenge" in reread,false);assert.equal(reread.auth!.refreshToken,"private-refresh");assert.equal(writes,2);
  const readonly=storage.createIronSessionPort(reread,next,true);
  readonly.destroy();assert.equal(writes,2);await assert.rejects(readonly.save(next));assert.equal(writes,2);
});

test("failed cookie save does not replace the port's current authoritative state",async()=>{
  const fake={save:async()=>{throw Error("failed");},destroy:()=>{},updateConfig:()=>{}};
  const port=storage.createIronSessionPort(fake as Awaited<ReturnType<typeof getIronSession<AuthSessionData>>>,initial,false);
  await assert.rejects(port.save({...initial,auth:{...initial.auth!,account:{...initial.auth!.account,displayName:"late"}}}));
  assert.equal(port.read()!.auth!.account.displayName,"نام");
});
