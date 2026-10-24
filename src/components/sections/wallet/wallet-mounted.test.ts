import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import * as nodeModule from 'node:module';
import {act,createElement as h,StrictMode} from 'react';
import {pendingKey} from '@/lib/wallet-client';
import type {WalletInitial} from './wallet-types';
const id='12345678-1234-4123-8123-123456789abc';
const key='22345678-1234-4123-8123-123456789abc';
const id2='32345678-1234-4123-8123-123456789abc';
const key2='42345678-1234-4123-8123-123456789abc';
const account={id:7001,displayName:'Offline',role:'client' as const,loginPhoneMasked:null,avatar:null,location:null,specialist:null};
const packs=[10000,50000,100000].map(n=>({packId:`irt-${n}`,catalogVersion:'local-irt-v1',amountIRT:n,currency:'IRT'}));
const summary={balanceIRT:12345,currency:'IRT',localPaymentReady:true,packs,items:[]};
const intent={id,requestKey:key,purpose:'wallet_topup',packId:'irt-10000',catalogVersion:'local-irt-v1',amountIRT:10000,currency:'IRT',state:'pending',createdAt:'2026-10-23T12:00:00.000Z',updatedAt:'2026-10-23T12:00:00.000Z',expiresAt:'2026-10-23T12:15:00.000Z',simulated:true,ledgerId:null,creditedBalanceIRT:null};
const pending=(phase='review')=>JSON.stringify({version:1,requestKey:key,packId:'irt-10000',phase,intentId:id});
const initial=(overrides:object={}):WalletInitial=>({account,summary,intent:null,error:null,...overrides} as WalletInitial);
function deferred(){let resolve!:(r:Response)=>void;let reject!:(e:unknown)=>void;const promise=new Promise<Response>((y,n)=>{resolve=y;reject=n;});return {resolve,reject,promise};}
const json=(v:unknown,status=200)=>Response.json(v,{status});
const error=(code:string,status=503,uncertain=false)=>json({error:{code,reconciliationRequired:uncertain}},status);
test('actual mounted wallet + AuthSummaryProvider, isolated offline DOM lifecycle',async t=>{
 const require=createRequire(import.meta.url);const {JSDOM}=require('jsdom') as {JSDOM:new(html:string,options:object)=>{window:Window & typeof globalThis}};
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/wallet?status=success',pretendToBeVisual:true});const win=dom.window;
 const originals=new Map<string,PropertyDescriptor|undefined>();const install=(k:string,v:unknown)=>{originals.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true});};
 Object.defineProperty(win,'matchMedia',{value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});
 for(const [k,v] of Object.entries({window:win,self:win,document:win.document,navigator:win.navigator,HTMLElement:win.HTMLElement,Element:win.Element,Node:win.Node,getComputedStyle:win.getComputedStyle.bind(win),requestAnimationFrame:win.requestAnimationFrame.bind(win),cancelAnimationFrame:win.cancelAnimationFrame.bind(win),IS_REACT_ACT_ENVIRONMENT:true}))install(k,v);
 let route:((p:string,i?:RequestInit)=>Promise<Response>)|undefined;const unexpected:string[]=[];
 install('fetch',async(p:unknown,i?:RequestInit)=>{if(typeof p!=='string'||!p.startsWith('/api/')||!route){unexpected.push(String(p));throw Error('Unexpected request');}return route(p,i);});
 try{
  const {createRoot}=await import('react-dom/client');const {WalletWorkspace}=await import('./WalletWorkspace.tsx');const {PaymentSessionRecovery}=await import('./PaymentSessionRecovery.tsx');
  const {AuthSummaryProvider,useAuthSummary}=await import('@/components/layout/useAuthSummary');
  const {AppRouterContext}=await import('next/dist/shared/lib/app-router-context.shared-runtime.js');
  // Import the actual synchronous RSC-renderer boundary, mocking only its unused
  // server read modules. No fake key or test replacement wraps the client machine.
  const {registerHooks}=nodeModule as unknown as {registerHooks(h:{resolve(s:string,c:{parentURL?:string},n:(s:string,c:{parentURL?:string})=>{url:string;shortCircuit?:boolean}):{url:string;shortCircuit?:boolean}}):{deregister():void}};
  const serverReads='data:text/javascript,export async function readOwnerAccount(){throw Error("unexpected server read")};export async function readWalletSummary(){throw Error("unexpected server read")};export async function readLocalTopup(){throw Error("unexpected server read")}';
  const hooks=registerHooks({resolve(s,c,n){if(s==='server-only')return {url:'data:text/javascript,export{}',shortCircuit:true};if(s==='@/services/profile/profile-bff.server'||s==='@/services/payments/payment-bff.server')return {url:serverReads,shortCircuit:true};return n(s,c);}});
  const {WalletWorkspaceBoundary}=await import('./WalletPage.server.tsx').finally(()=>hooks.deregister());
  function Controls(){const a=useAuthSummary();return h('aside',null,h('button',{onClick:()=>a.clearAccount(true),'data-invalidate':true},'invalidate'),h('button',{onClick:()=>void a.refresh()},'refresh summary'),h('button',{onClick:()=>void a.logout()},'logout'));}
  async function harness(value=initial(),stored?:string,storageBroken=false,recoveryTarget?:'/wallet'|`/wallet/payments/${string}`,serverBoundary=false){
   win.sessionStorage.clear();if(stored)win.sessionStorage.setItem(pendingKey(account.id),stored);
   const descriptor=Object.getOwnPropertyDescriptor(win,'sessionStorage');if(storageBroken)Object.defineProperty(win,'sessionStorage',{configurable:true,get(){throw Error('disabled');}});
   const calls:{p:string;i?:RequestInit}[]=[];const waits:ReturnType<typeof deferred>[]=[];const paths:string[]=[];let beforePost:(()=>void)|undefined;let authAccount=value.account;
   route=async(p,i)=>{
    calls.push({p,i});const method=i?.method??'GET';
    if(p==='/api/auth/me'&&method==='GET')return json({account:authAccount});
    const allowed=method==='GET'&&(p==='/api/wallet/summary'||[id,id2].some(uuid=>p===`/api/payments/local/topups/${uuid}`)||/^\/api\/payments\/local\/topups\/lookup\?requestKey=[0-9a-f-]{36}$/u.test(p))||method==='POST'&&['/api/auth/logout','/api/auth/refresh','/api/payments/local/topups',...[id,id2].flatMap(uuid=>[`/api/payments/local/topups/${uuid}/confirm`,`/api/payments/local/topups/${uuid}/cancel`])].includes(p);
    if(!allowed){unexpected.push(`${method} ${p}`);throw Error('Unexpected route');}
    if(method==='POST')beforePost?.();const d=deferred();waits.push(d);return d.promise;
   };
   const host=win.document.createElement('main');win.document.body.append(host);const root=createRoot(host);
   const router={bfcacheId:'offline-wallet',push:(p:string)=>{paths.push(p);},replace:(p:string)=>{paths.push(p);},refresh(){},back(){},forward(){},prefetch:async()=>{}};
   const render=async(next:WalletInitial)=>act(async()=>root.render(h(StrictMode,null,h(AppRouterContext.Provider,{value:router},h(AuthSummaryProvider,null,h(Controls),recoveryTarget?h(PaymentSessionRecovery,{target:recoveryTarget}):h(serverBoundary?WalletWorkspaceBoundary:WalletWorkspace,{initial:next}))))));
   await render(value);
   const button=(label:string)=>{const b=Array.from(host.querySelectorAll('button')).find(b=>b.textContent===label);assert.ok(b,`button ${label}`);return b;};
   const click=async(label:string,twice=false)=>act(async()=>{const b=button(label);b.click();if(twice)b.click();});
   const respond=async(v:Response,n=waits.length-1)=>act(async()=>waits[n].resolve(v));
   const select=async()=>act(async()=>host.querySelector<HTMLInputElement>('input[type=radio]')!.click());
   const posts=()=>calls.filter(c=>c.i?.method==='POST');const reads=()=>calls.filter(c=>c.i?.method==='GET'&&c.p!=='/api/auth/me');
   let mounted=true;const unmount=async()=>{if(mounted){await act(async()=>root.unmount());mounted=false;}};
   const close=async()=>{await unmount();await act(async()=>{for(const d of waits)d.reject(Error('closed'));});host.remove();route=undefined;if(storageBroken&&descriptor)Object.defineProperty(win,'sessionStorage',descriptor);};
   return {host,calls,waits,paths,button,click,respond,select,posts,reads,close,unmount,render,setAuthAccount:(next:WalletInitial['account'])=>{authAccount=next;},beforePost:(f:()=>void)=>{beforePost=f;}};
  }
  await t.test('actual exported server renderer boundary isolates account replacement in the same mounted provider and root',async()=>{
   const a=await harness(initial(),undefined,false,undefined,true);try{
    const nextAccount={...account,id:7002};a.setAuthAccount(nextAccount);await a.click('refresh summary');
    await a.render(initial({account:nextAccount,summary:{...summary,balanceIRT:90000}}));
    assert.equal(a.host.querySelector('[data-balance]')?.textContent,'۹۰٬۰۰۰ تومان');assert.ok(!a.host.textContent?.includes('۱۲٬۳۴۵'));assert.equal(a.posts().length,0);
   }finally{await a.close();}
  });
  for(const nextAccount of [{...account,id:7002},{...account,role:'specialist' as const,specialist:{id:7008,slug:'offline-new-role',status:'draft' as const}}])await t.test(`same root actual auth + fresh RSC identity ${nextAccount.id}/${nextAccount.role} never reuses old balance`,async()=>{
   const a=await harness();const seen:string[]=[];let observer:MutationObserver|undefined;
   try{
    await a.select();a.setAuthAccount(nextAccount);await a.click('refresh summary');assert.equal(a.host.querySelector('[data-balance]'),null);
    observer=new win.MutationObserver(()=>seen.push(a.host.textContent??''));observer.observe(a.host,{subtree:true,childList:true,characterData:true});
    await a.render(initial({account:nextAccount,summary:{...summary,balanceIRT:90000}}));
    assert.equal(a.host.querySelector('[data-balance]')?.textContent,'۹۰٬۰۰۰ تومان');assert.ok(!seen.some(text=>text.includes('۱۲٬۳۴۵')));
    assert.equal(a.host.querySelectorAll('input:checked').length,0,'selection belongs to old identity, not the new machine');
    assert.equal(a.posts().length,0);
   }finally{observer?.disconnect();await a.close();}
  });
  await t.test('account switch with fresh pending checkout props cannot expose the prior account receipt or confirm its ID',async()=>{
   const a=await harness(initial({intent:{...intent,state:'succeeded',ledgerId:31,creditedBalanceIRT:22345}}));
   try{
    const nextAccount={...account,id:7002};a.setAuthAccount(nextAccount);await a.click('refresh summary');
    await a.render(initial({account:nextAccount,intent:{...intent,id:id2,requestKey:key2},targetId:id2,summary:null}));
    assert.ok(!a.host.textContent?.includes('شارژ ثبت شد'));assert.ok(!a.host.textContent?.includes('۲۲٬۳۴۵'));assert.ok(!a.host.textContent?.includes(id));assert.ok(a.host.textContent?.includes(id2));
    await a.click('تأیید پرداخت آزمایشی محلی');assert.equal(a.posts().at(-1)?.p,`/api/payments/local/topups/${id2}/confirm`);
    assert.equal(JSON.parse(win.sessionStorage.getItem(pendingKey(7002))!).intentId,id2);
   }finally{await a.close();}
  });
  await t.test('same account target switch replaces old receipt and explicitly confirms only new intent',async()=>{
   const a=await harness(initial({intent:{...intent,state:'succeeded',ledgerId:31,creditedBalanceIRT:22345}}));
   try{
    await a.render(initial({intent:{...intent,id:id2,requestKey:key2},targetId:id2,summary:null}));
    assert.ok(!a.host.textContent?.includes('شارژ ثبت شد'));assert.ok(!a.host.textContent?.includes(id));
    await a.click('تأیید پرداخت آزمایشی محلی');assert.equal(a.posts().length,1);assert.equal(a.posts()[0].p,`/api/payments/local/topups/${id2}/confirm`);
   }finally{await a.close();}
  });
  await t.test('old in-flight wallet read cannot populate a fresh different-account machine',async()=>{
   const a=await harness();try{
    await a.click('خواندن موجودی فعلی');const oldRead=a.reads()[0];
    const nextAccount={...account,id:7002};a.setAuthAccount(nextAccount);await a.click('refresh summary');
    await a.render(initial({account:nextAccount,summary:{...summary,balanceIRT:90000}}));
    assert.equal(oldRead.i?.signal?.aborted,true);await a.respond(json({summary:{...summary,balanceIRT:11111}}));
    assert.equal(a.host.querySelector('[data-balance]')?.textContent,'۹۰٬۰۰۰ تومان');assert.equal(a.posts().length,0);
   }finally{await a.close();}
  });
  await t.test('old in-flight checkout cannot populate a new target or replace its preserved blocked record',async()=>{
   const a=await harness(initial({intent,summary:null}),pending());try{
    await a.click('تأیید پرداخت آزمایشی محلی');const saved=win.sessionStorage.getItem(pendingKey(account.id));
    await a.render(initial({intent:{...intent,id:id2,requestKey:key2},targetId:id2,summary:null}));
    assert.equal(a.posts()[0].i?.signal?.aborted,true);await a.respond(json({intent:{...intent,state:'succeeded',ledgerId:31,creditedBalanceIRT:22345}}));
    assert.ok(!a.host.textContent?.includes('شارژ ثبت شد'));assert.ok(a.host.textContent?.includes(id2));assert.ok(!a.host.textContent?.includes(id));
    assert.equal(a.button('تأیید پرداخت آزمایشی محلی').disabled,true,'other pending ID remains a conflict, never reused');
    assert.equal(win.sessionStorage.getItem(pendingKey(account.id)),saved);await a.click('خواندن وضعیت پرداخت');assert.equal(a.reads().at(-1)?.p,`/api/payments/local/topups/${id2}`);
    assert.equal(a.posts().length,1);
   }finally{await a.close();}
  });
  await t.test('same lifetime RSC update reconciles fresh balance without remounting the form or accepting an older in-flight read',async()=>{
   const a=await harness();try{
    await a.select();const radio=a.host.querySelector('input[type=radio]');await a.click('خواندن موجودی فعلی');
    await a.render(initial({summary:{...summary,balanceIRT:90000}}));
    assert.equal(a.host.querySelector('[data-balance]')?.textContent,'۹۰٬۰۰۰ تومان');assert.equal(a.host.querySelector('input[type=radio]'),radio);assert.equal(a.host.querySelectorAll('input:checked').length,1);
    assert.equal(a.reads()[0].i?.signal?.aborted,true);await a.respond(json({summary:{...summary,balanceIRT:11111}}));assert.equal(a.host.querySelector('[data-balance]')?.textContent,'۹۰٬۰۰۰ تومان');
   }finally{await a.close();}
  });
  await t.test('same lifetime fresh pending RSC props never clear durable uncertain confirm or replay after 404',async()=>{
   const a=await harness(initial({intent,summary:null}),pending());try{
    await a.click('تأیید پرداخت آزمایشی محلی');await a.respond(error('payment_outcome_unknown',503,true));
    const saved=win.sessionStorage.getItem(pendingKey(account.id));const button=a.button('تأیید پرداخت آزمایشی محلی');
    await a.render(initial({intent:{...intent},summary:null}));assert.equal(a.button('تأیید پرداخت آزمایشی محلی'),button);assert.equal(button.disabled,true);assert.equal(win.sessionStorage.getItem(pendingKey(account.id)),saved);
    await a.click('خواندن وضعیت پرداخت');await a.respond(error('local_payment_not_found',404));assert.equal(button.disabled,true);assert.equal(win.sessionStorage.getItem(pendingKey(account.id)),saved);assert.equal(a.posts().length,1);
   }finally{await a.close();}
  });
  await t.test('unavailable never renders a fake zero or invented packs',async()=>{const a=await harness(initial({summary:null,error:{status:503,code:'payment_unavailable'}}));try{assert.ok(a.host.textContent?.includes('در دسترس نیست'));assert.equal(a.host.querySelector('[data-balance]'),null);assert.equal(a.host.querySelectorAll('input[type=radio]').length,0);}finally{await a.close();}});
  await t.test('disarmed displays authoritative balance with three disabled semantic radios',async()=>{const a=await harness(initial({summary:{...summary,localPaymentReady:false}}));try{assert.equal(a.host.querySelector('[data-balance]')?.textContent,'۱۲٬۳۴۵ تومان');assert.equal(a.host.querySelectorAll('input[type=radio]:disabled').length,3);assert.equal(a.button('ایجاد درخواست آزمایشی').disabled,true);assert.ok(a.host.textContent?.includes('پول واقعی'));}finally{await a.close();}});
  await t.test('double create dispatches once, key is durable before fetch, no amount, correlated navigation only',async()=>{const a=await harness();try{await a.select();a.beforePost(()=>{const r=JSON.parse(win.sessionStorage.getItem(pendingKey(account.id))!);assert.equal(r.phase,'blocked');assert.match(r.requestKey,/^[0-9a-f-]{36}$/);});await a.click('ایجاد درخواست آزمایشی',true);assert.equal(a.posts().length,1);const body=JSON.parse(String(a.posts()[0].i?.body));assert.deepEqual(Object.keys(body).sort(),['packId','requestKey']);await a.respond(json({intent:{...intent,requestKey:body.requestKey}}));assert.deepEqual(a.paths,[`/wallet/payments/${id}`]);}finally{await a.close();}});
  await t.test('unknown create original key lookup 404 and failed GET preserve blocked record; reload never POSTs',async()=>{const a=await harness();let stored='';try{await a.select();await a.click('ایجاد درخواست آزمایشی');const body=JSON.parse(String(a.posts()[0].i?.body));await a.respond(error('payment_outcome_unknown',503,true));stored=win.sessionStorage.getItem(pendingKey(account.id))!;await a.click('خواندن درخواست قبلی');assert.equal(a.reads().at(-1)?.p,`/api/payments/local/topups/lookup?requestKey=${body.requestKey}`);await a.respond(error('local_payment_not_found',404));assert.equal(win.sessionStorage.getItem(pendingKey(account.id)),stored);assert.equal(a.button('ایجاد درخواست آزمایشی').disabled,true);await a.click('خواندن درخواست قبلی');await a.respond(error('rate_limited',429));assert.equal(a.posts().length,1);assert.equal(win.sessionStorage.getItem(pendingKey(account.id)),stored);}finally{await a.close();}const b=await harness(initial(),stored);try{assert.equal(b.posts().length,0);assert.equal(b.button('ایجاد درخواست آزمایشی').disabled,true);}finally{await b.close();}});
  await t.test('account two does not recover account one record',async()=>{const a=await harness(initial({account:{...account,id:7002}}),pending());try{assert.equal(a.host.querySelectorAll('input[type=radio]').length,3);assert.ok(!a.host.textContent?.includes('یک درخواست قبلی دارید'));assert.equal(a.posts().length,0);assert.equal(a.reads().length,0);}finally{await a.close();}});
  for(const broken of [false,true])await t.test(`malformed or unavailable storage fails closed (${broken})`,async()=>{const a=await harness(initial(),broken?undefined:'malformed',broken);try{await a.select();assert.equal(a.button('ایجاد درخواست آزمایشی').disabled,true);assert.equal(a.posts().length,0);}finally{await a.close();}});
  for(const action of ['تأیید پرداخت آزمایشی محلی','لغو درخواست'])await t.test(`explicit pending ${action} has one gated POST and no optimistic success`,async()=>{const a=await harness(initial({intent,summary:null}),pending());try{await a.click(action,true);assert.equal(a.posts().length,1);assert.equal(a.posts()[0].i?.body,'{}');assert.equal(JSON.parse(win.sessionStorage.getItem(pendingKey(account.id))!).phase,'blocked');assert.ok(!a.host.textContent?.includes('شارژ ثبت شد'));const state=action.startsWith('تأیید')?'succeeded':'cancelled';const next={...intent,state,...(state==='succeeded'?{ledgerId:31,creditedBalanceIRT:22345}:{})};await a.respond(json({intent:next}));assert.equal(a.reads().length,1);await a.respond(json({intent:next}));if(state==='succeeded'){assert.ok(a.host.textContent?.includes('شارژ ثبت شد'));await a.respond(json({summary:{...summary,balanceIRT:30000}}));assert.equal(a.host.querySelector('[data-balance]')?.textContent,'۳۰٬۰۰۰ تومان');assert.ok(a.host.textContent?.includes('۲۲٬۳۴۵'));}assert.equal(win.sessionStorage.getItem(pendingKey(account.id)),null);}finally{await a.close();}});
  await t.test('uncertain confirm plus pending status remains blocked across reload; URL success is ignored',async()=>{const a=await harness(initial({intent,summary:null}),pending());let stored='';try{assert.ok(!a.host.textContent?.includes('شارژ ثبت شد'));await a.click('تأیید پرداخت آزمایشی محلی');await a.respond(error('payment_outcome_unknown',503,true));await a.click('خواندن وضعیت پرداخت');await a.respond(json({intent}));assert.equal(a.button('تأیید پرداخت آزمایشی محلی').disabled,true);assert.equal(a.posts().length,1);stored=win.sessionStorage.getItem(pendingKey(account.id))!;}finally{await a.close();}const b=await harness(initial({intent,summary:null}),stored);try{assert.equal(b.button('تأیید پرداخت آزمایشی محلی').disabled,true);assert.equal(b.posts().length,0);}finally{await b.close();}});
  await t.test('explicit auth refresh is one POST then GET only, no replay',async()=>{const a=await harness(initial({intent,summary:null}),pending());try{await a.click('تأیید پرداخت آزمایشی محلی');await a.respond(error('refresh_required',401,true));await a.click('بازیابی نشست و خواندن وضعیت',true);assert.equal(a.posts().length,2);assert.equal(a.posts()[1].p,'/api/auth/refresh');await a.respond(json({}));assert.equal(a.reads().at(-1)?.p,`/api/payments/local/topups/${id}`);await a.respond(json({intent}));assert.equal(a.posts().length,2);assert.equal(a.button('تأیید پرداخت آزمایشی محلی').disabled,true);}finally{await a.close();}});
  await t.test('logout invalidates deferred create and prevents navigation or stale updates',async()=>{const a=await harness();try{await a.select();await a.click('ایجاد درخواست آزمایشی');const body=JSON.parse(String(a.posts()[0].i?.body));await a.click('invalidate');assert.equal(a.posts()[0].i?.signal?.aborted,true);await a.respond(json({intent:{...intent,requestKey:body.requestKey}}));assert.equal(a.paths.length,0);assert.equal(a.host.querySelector('[data-balance]'),null);}finally{await a.close();}});
  await t.test('actual logout cancels pending payment and late success cannot affect the logged-out view',async()=>{const a=await harness();try{await a.select();await a.click('ایجاد درخواست آزمایشی');const body=JSON.parse(String(a.posts()[0].i?.body));await a.click('logout');assert.equal(a.posts()[0].i?.signal?.aborted,true);assert.equal(a.calls.at(-1)?.p,'/api/auth/logout');await a.respond(json({}),1);await a.respond(json({intent:{...intent,requestKey:body.requestKey}}),0);assert.equal(a.paths.length,0);assert.equal(a.host.querySelector('[data-balance]'),null);assert.ok(win.sessionStorage.getItem(pendingKey(account.id)));}finally{await a.close();}});
  await t.test('actual summary role switch cancels in-flight response and hides prior-account monetary data',async()=>{const a=await harness();try{await a.select();await a.click('ایجاد درخواست آزمایشی');const body=JSON.parse(String(a.posts()[0].i?.body));a.setAuthAccount({...account,role:'specialist',specialist:{id:7008,slug:'offline-switch',status:'draft'}});await a.click('refresh summary');assert.equal(a.posts()[0].i?.signal?.aborted,true);await a.respond(json({intent:{...intent,requestKey:body.requestKey}}));assert.equal(a.paths.length,0);assert.equal(a.host.querySelector('[data-balance]'),null);}finally{await a.close();}});
  await t.test('same-account summary restoration leaves cancelled write blocked but permits explicit lookup',async()=>{const a=await harness();try{await a.select();await a.click('ایجاد درخواست آزمایشی');await a.click('invalidate');await a.click('refresh summary');assert.equal(a.button('خواندن درخواست قبلی').disabled,false);assert.equal(a.button('ایجاد درخواست آزمایشی').disabled,true);assert.equal(a.posts().length,1);}finally{await a.close();}});
  await t.test('storage set failure is caught before a create dispatch',async()=>{const a=await harness();const prototype=Object.getPrototypeOf(win.sessionStorage);const original=prototype.setItem;try{prototype.setItem=()=>{throw Error('quota');};await a.select();await a.click('ایجاد درخواست آزمایشی');assert.equal(a.posts().length,0);assert.equal(a.button('ایجاد درخواست آزمایشی').disabled,true);}finally{prototype.setItem=original;await a.close();}});
  await t.test('correlation mismatch stays uncertain and cannot navigate or retry',async()=>{const a=await harness();try{await a.select();await a.click('ایجاد درخواست آزمایشی');await a.respond(json({intent}));assert.equal(a.paths.length,0);assert.equal(a.button('ایجاد درخواست آزمایشی').disabled,true);assert.ok(a.host.textContent?.includes('نتیجه قطعی نیست'));}finally{await a.close();}});
  for(const state of ['cancelled','expired','failed'])await t.test(`authoritative ${state} never displays credited success or confirmation action`,async()=>{const a=await harness(initial({intent:{...intent,state},summary:null}));try{assert.ok(!a.host.textContent?.includes('شارژ ثبت شد'));assert.ok(!a.host.textContent?.includes('تأیید پرداخت آزمایشی محلی'));assert.equal(a.host.querySelector('[data-balance]'),null);assert.equal(a.posts().length,0);}finally{await a.close();}});
  await t.test('429 confirmation and failed status GET cannot unlock or erase pending',async()=>{const a=await harness(initial({intent,summary:null}),pending());try{await a.click('تأیید پرداخت آزمایشی محلی');await a.respond(error('rate_limited',429));const saved=win.sessionStorage.getItem(pendingKey(account.id));await a.click('خواندن وضعیت پرداخت');await a.respond(error('payment_unavailable'));assert.equal(a.button('تأیید پرداخت آزمایشی محلی').disabled,true);assert.equal(win.sessionStorage.getItem(pendingKey(account.id)),saved);assert.equal(a.posts().length,1);}finally{await a.close();}});
  await t.test('lost create found as pending opens review without replay; confirm remains a separate explicit action',async()=>{const a=await harness(initial(),JSON.stringify({version:1,requestKey:key,packId:'irt-10000',phase:'blocked'}));try{await a.click('خواندن درخواست قبلی');await a.respond(json({intent}));assert.equal(a.posts().length,0);assert.deepEqual(a.paths,[`/wallet/payments/${id}`]);assert.equal(JSON.parse(win.sessionStorage.getItem(pendingKey(account.id))!).phase,'review');}finally{await a.close();}});
  await t.test('unmount aborts create but retains key; late response does not navigate',async()=>{const a=await harness();try{await a.select();await a.click('ایجاد درخواست آزمایشی');const body=JSON.parse(String(a.posts()[0].i?.body));await a.unmount();assert.equal(a.posts()[0].i?.signal?.aborted,true);await a.respond(json({intent:{...intent,requestKey:body.requestKey}}));assert.equal(a.paths.length,0);assert.ok(win.sessionStorage.getItem(pendingKey(account.id)));}finally{await a.close();}});
  for(const target of ['/wallet',`/wallet/payments/${id}`] as const)await t.test(`dedicated recovery ${target} is explicit one refresh then one status read only`,async()=>{const a=await harness(initial(),undefined,false,target);try{assert.equal(a.posts().length,0);await a.click('بازیابی نشست و خواندن وضعیت',true);assert.equal(a.posts().length,1);assert.equal(a.posts()[0].p,'/api/auth/refresh');await a.respond(json({}));assert.equal(a.reads().at(-1)?.p,target==='/wallet'?'/api/wallet/summary':`/api/payments/local/topups/${id}`);await a.respond(json(target==='/wallet'?{summary}:{intent}));assert.deepEqual(a.paths,[target]);assert.equal(a.posts().length,1);}finally{await a.close();}});
  await t.test('logout during dedicated recovery aborts refresh and prevents later reads',async()=>{const a=await harness(initial(),undefined,false,'/wallet');try{await a.click('بازیابی نشست و خواندن وضعیت');await a.click('logout');assert.equal(a.posts()[0].i?.signal?.aborted,true);await a.respond(json({}),1);await a.respond(json({}),0);assert.equal(a.reads().length,0);assert.equal(a.paths.length,0);}finally{await a.close();}});
  await t.test('unmounted dedicated recovery cannot follow refresh with a read or navigation',async()=>{const a=await harness(initial(),undefined,false,'/wallet');try{await a.click('بازیابی نشست و خواندن وضعیت');await a.unmount();assert.equal(a.posts()[0].i?.signal?.aborted,true);await a.respond(json({}));assert.equal(a.reads().length,0);assert.equal(a.paths.length,0);}finally{await a.close();}});
  await t.test('labels, keyboard focus and native radio semantics remain usable',async()=>{const a=await harness();try{const radio=a.host.querySelector<HTMLInputElement>('input[type=radio]')!;assert.ok(radio.labels?.length);radio.focus();assert.equal(win.document.activeElement,radio);assert.ok(a.host.querySelector('fieldset legend'));assert.ok(a.host.querySelector('[role=status]'));}finally{await a.close();}});
  assert.deepEqual(unexpected,[]);
 }finally{for(const [k,v] of originals){if(v)Object.defineProperty(globalThis,k,v);else Reflect.deleteProperty(globalThis,k);}win.close();}
});
