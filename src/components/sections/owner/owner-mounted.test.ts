import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {act,createElement as h,Fragment,StrictMode} from 'react';
import type {Root} from 'react-dom/client';
import type {OwnerScreen} from '@/lib/owner-ui';
import type {MediaCapabilitiesDto,ProfileDto} from '@/services/profile/profile-contracts';

const account={id:7001,displayName:'Offline owner',role:'specialist' as const,loginPhoneMasked:null,avatar:null,location:null,specialist:{id:7002,slug:'offline-owner',status:'draft' as const}};
const profile:ProfileDto={id:7002,slug:'offline-owner',title:'Offline profile',status:'draft',categories:[],cities:[],avatar:null,bio:'',skills:'',address:'',availability:'',priceHint:'',experienceYears:null,gallery:[{id:7003,url:'http://localhost/fixture-never-loaded.png',type:'image',caption:'Offline gallery image'}],galleryRevision:1,galleryAvailable:true};
const removed={gallery:[],galleryRevision:2,galleryAvailable:true,status:'draft' as const};
const fresh:ProfileDto={...profile,...removed};
const capabilities:MediaCapabilitiesDto={purposes:['public-avatar','public-portfolio'],imageMimes:['image/png'],maxBytes:1024,maxDimension:1024,maxPixels:1048576,maxFiles:1,maxGalleryItems:20,video:{enabled:false,reason:'video_unsupported'},imageDecoderRequired:true};
const initial=(value=profile):Extract<OwnerScreen,{kind:'ready'}>=>({kind:'ready',account,profile:value,capabilities,cities:[],categories:[],optionsUnavailable:false});
const success='ارجاع تصویر جدا شد؛ فایل عمومی حذف نشده است.';
const empty='تصویری در گالری ثبت نشده است.';
const detachLabel='جدا کردن از گالری';
const reloadLabel='بارگذاری دوباره وضعیت';
function deferred<T>() {
 let resolve!:(value:T)=>void;
 let reject!:(reason:unknown)=>void;
 const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});
 return {promise,resolve,reject};
}
const json=(value:unknown,status=200)=>Response.json(value,{status});
const failure=(code:string,status:number,reloadRequired=false)=>json({error:{code,reloadRequired}},status);

// One serial suite owns the DOM globals. No native fetch fallback, external
// resource loader, hook mocks, fake provider, testing library, or effect shim.
test('actual OwnerEditor + AuthSummaryProvider mounted offline lifecycle',async t=>{
 const require=createRequire(import.meta.url);
 const {JSDOM}=require('jsdom') as {JSDOM:new(html:string,options:object)=>{window:Window & typeof globalThis}};
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/',pretendToBeVisual:true});
 const win=dom.window;
 const originals=new Map<string,PropertyDescriptor|undefined>();
 const install=(key:string,value:unknown)=>{
  originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
  Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 };
 // jsdom has no matchMedia. Only reduced motion matches; no application effect
 // is bypassed. Resources are disabled by jsdom's default (no `resources`).
 Object.defineProperty(win,'matchMedia',{value:(query:string)=>({matches:query==='(prefers-reduced-motion: reduce)',media:query,onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;}})});
 for(const [key,value] of Object.entries({window:win,self:win,document:win.document,navigator:win.navigator,HTMLElement:win.HTMLElement,Element:win.Element,Node:win.Node,MutationObserver:win.MutationObserver,getComputedStyle:win.getComputedStyle.bind(win),requestAnimationFrame:win.requestAnimationFrame.bind(win),cancelAnimationFrame:win.cancelAnimationFrame.bind(win),IS_REACT_ACT_ENVIRONMENT:true}))install(key,value);
 let router:((path:string,init?:RequestInit)=>Promise<Response>)|undefined;
 const unexpected:string[]=[];
 const offlineFetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
  if(typeof input!=='string'||!input.startsWith('/api/')||input.startsWith('//')||!router){
   unexpected.push(`unexpected request: ${String(input)}`);throw new Error(unexpected.at(-1));
  }
  return router(input,init);
 };
 install('fetch',offlineFetch);
 win.fetch=offlineFetch;
 let activeRoot:Root|undefined;
 try{
  // DOM must precede these imports: Button's actual GSAP/useGSAP runs normally.
  const {createRoot}=await import('react-dom/client');
  const {OwnerEditor}=await import('./OwnerEditor.tsx');
  const {AuthSummaryProvider,useAuthSummary}=await import('@/components/layout/useAuthSummary');
  function Consumer({name}:{name:string}) {
   const summary=useAuthSummary();
   return h('aside',{'data-consumer':name},
    h('output',null,JSON.stringify({id:summary.account?.id??null,pending:summary.pending,error:summary.error,logoutPending:summary.logoutPending,logoutError:summary.logoutError})),
    h('button',{'data-refresh':name,onClick:()=>void summary.refresh()},'summary read'),
    h('button',{'data-logout':name,onClick:()=>void summary.logout()},'logout'),
    h('button',{'data-clear':name,onClick:()=>summary.clearAccount(true)},'invalidate'));
  }
  async function harness(strict=true){
   const calls:{path:string;method:string;body:unknown;signal:AbortSignal|null|undefined}[]=[];
   const summaries:ReturnType<typeof deferred<Response>>[]=[];
   const deletes:ReturnType<typeof deferred<Response>>[]=[];
   const reads:ReturnType<typeof deferred<Response>>[]=[];
   const logouts:ReturnType<typeof deferred<Response>>[]=[];
   const waiting=new Set<ReturnType<typeof deferred<Response>>>();
   const enqueue=(list:ReturnType<typeof deferred<Response>>[],signal?:AbortSignal|null)=>{
    const item=deferred<Response>();list.push(item);waiting.add(item);
    const abort=()=>item.reject(new DOMException('Aborted','AbortError'));
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
    return item.promise.finally(()=>{waiting.delete(item);signal?.removeEventListener('abort',abort);});
   };
   router=async(path,init)=>{
    const method=init?.method??'GET';
    calls.push({path,method,body:init?.body,signal:init?.signal});
    if(path==='/api/auth/me'&&method==='GET')return enqueue(summaries);
    if(path==='/api/profile/media'&&method==='GET')return json({capabilities});
    if(path==='/api/profile/gallery/media/7003'&&method==='DELETE')return enqueue(deletes);
    if(path==='/api/profile/me'&&method==='GET')return enqueue(reads,init?.signal);
    if(path==='/api/auth/logout'&&method==='POST')return enqueue(logouts);
    unexpected.push(`unhandled ${method} ${path}`);throw new Error(unexpected.at(-1));
   };
   const host=win.document.createElement('main');win.document.body.append(host);
   const root=createRoot(host);activeRoot=root;
   const render=async(show=true,value=profile)=>{
    const children=h(AuthSummaryProvider,null,h(Consumer,{name:'a'}),h(Consumer,{name:'b'}),show?h(OwnerEditor,{initial:initial(value)}):null);
    await act(async()=>root.render(h(strict?StrictMode:Fragment,null,children)));
   };
   const resolve=async(item:ReturnType<typeof deferred<Response>>,response:Response)=>{await act(async()=>item.resolve(response));};
   const click=async(button:HTMLButtonElement)=>{await act(async()=>button.click());};
   const button=(label:string)=>{
    const found=Array.from(host.querySelectorAll('button')).find(node=>node.textContent===label);
    assert.ok(found,`button exists: ${label}`);return found;
   };
   const selector=(value:string)=>{const node=host.querySelector<HTMLButtonElement>(value);assert.ok(node,value);return node;};
   const summary=()=>{
    const a=host.querySelector('[data-consumer="a"] output')?.textContent;
    assert.equal(a,host.querySelector('[data-consumer="b"] output')?.textContent,'two actual consumers share the snapshot');
    return JSON.parse(a??'null') as {id:number|null;pending:boolean;error:boolean;logoutPending:boolean;logoutError:boolean};
   };
   const busy=(value:boolean)=>{assert.equal(host.querySelector('[aria-busy]')?.getAttribute('aria-busy'),String(value));};
   const galleryCount=(count:number)=>assert.equal(host.querySelectorAll('figure').length,count);
   const detached=()=>{
    galleryCount(0);assert.ok(host.textContent?.includes(empty));
    assert.ok(Array.from(host.querySelectorAll('[role="status"]')).some(node=>node.textContent===success));
    busy(false);assert.ok(host.textContent?.includes('وضعیت: پیش‌نویس'));
    assert.ok(host.querySelector('a[href="/specialists/offline-owner"]'),'stable slug unchanged');
   };
   const start=async()=>{
    const oldRoot=host.querySelector('[aria-busy]');assert.ok(oldRoot);
    await click(button(detachLabel));busy(true);galleryCount(1);
    assert.equal(button(detachLabel).disabled,true);
    assert.equal(deletes.length,1);assert.equal(deletes[0]!==undefined,true);
    assert.equal(calls.find(call=>call.method==='DELETE')?.body,JSON.stringify({expected_revision:1}));
    await click(button(detachLabel));assert.equal(deletes.length,1,'disabled duplicate is not dispatched');
    return oldRoot;
   };
   async function close(){
    try{await act(async()=>root.unmount());}
    finally{
     activeRoot=undefined;
     await act(async()=>{for(const pending of waiting)pending.reject(new DOMException('Test closed','AbortError'));});
     host.remove();router=undefined;
    }
    assert.deepEqual(unexpected,[],'strict router never fell through');
    for(const call of calls.filter(call=>call.path==='/api/profile/media'))assert.equal(call.signal?.aborted,true,'capability readers aborted on cleanup');
   }
   try{
    await render();assert.ok(summaries.length>=1);
    // StrictMode runs mount effects twice. Resolve newest summary first, then
    // oldest, exercising the real store's generation check without mock state.
    for(const request of [...summaries].reverse())await resolve(request,json({account}));
    summary();galleryCount(1);busy(false);
   }catch(error){await close();throw error;}
   return {host,calls,summaries,deletes,reads,logouts,render,resolve,click,button,selector,summary,busy,galleryCount,detached,start,close};
  }

  for(const strict of [false,true])await t.test(`successful deferred detach updates the same mounted editor (StrictMode=${strict})`,async()=>{
   const app=await harness(strict);
   try{
    const ownerRoot=await app.start();
    await app.resolve(app.deletes[0],json({gallery:removed}));app.detached();
    assert.equal(app.host.querySelector('[aria-busy]'),ownerRoot,'no manual reload/remount');
    assert.equal(app.reads.length,0);assert.equal(app.summaries.length,strict?2:1,'detach does not refresh the provider');
   }finally{await app.close();}
  });

  await t.test('shared provider loading during DELETE preserves account, root, and accepted result',async()=>{
   const app=await harness();
   try{
    const ownerRoot=await app.start();
    await app.click(app.selector('[data-refresh="b"]'));
    assert.equal(app.summary().pending,true);assert.equal(app.summary().id,account.id);
    assert.equal(app.host.querySelector('[aria-busy]'),ownerRoot);
    await app.resolve(app.deletes[0],json({gallery:removed}));app.detached();
    await app.resolve(app.summaries.at(-1)!,json({account}));app.detached();
    assert.equal(app.host.querySelector('[aria-busy]'),ownerRoot);
   }finally{await app.close();}
  });

  for(const responseWhileHidden of [true,false])await t.test(`provider read failure/recovery during DELETE (response while hidden=${responseWhileHidden})`,async()=>{
   const app=await harness();
   try{
    const ownerRoot=await app.start();
    await app.click(app.selector('[data-refresh="a"]'));
    await app.resolve(app.summaries.at(-1)!,failure('account_unavailable',503));
    assert.equal(app.summary().error,true);assert.equal(app.summary().id,null);
    assert.equal(ownerRoot.isConnected,false,'access gate replaces DOM, not necessarily OwnerEditor');
    assert.equal(app.host.querySelector('[aria-busy]'),null);assert.ok(app.host.textContent?.includes('بررسی دسترسی حساب'));
    if(responseWhileHidden)await app.resolve(app.deletes[0],json({gallery:removed}));
    await app.click(app.selector('[data-refresh="b"]'));
    await app.resolve(app.summaries.at(-1)!,json({account}));
    if(!responseWhileHidden){app.busy(true);app.galleryCount(1);await app.resolve(app.deletes[0],json({gallery:removed}));}
    app.detached();assert.notEqual(app.host.querySelector('[aria-busy]'),ownerRoot,'new DOM still carries accepted state');
    assert.equal(app.deletes.length,1);assert.equal(app.reads.length,0);
   }finally{await app.close();}
  });

  await t.test('out-of-order provider loads from two consumers cannot discard the detach result',async()=>{
   const app=await harness();
   try{
    await app.start();await app.click(app.selector('[data-refresh="a"]'));const older=app.summaries.at(-1)!;
    await app.click(app.selector('[data-refresh="b"]'));const newer=app.summaries.at(-1)!;
    await app.resolve(newer,json({account}));await app.resolve(app.deletes[0],json({gallery:removed}));
    await app.resolve(older,failure('account_unavailable',503));
    assert.equal(app.summary().error,false);app.detached();
   }finally{await app.close();}
  });

  await t.test('actual unmount discards old response; remount uses fresh authoritative input',async()=>{
   const app=await harness();
   try{
    const oldRoot=await app.start();await app.render(false);
    assert.equal(oldRoot.isConnected,false);
    await app.render(true,fresh);app.galleryCount(0);app.busy(false);
    const newRoot=app.host.querySelector('[aria-busy]');
    await app.resolve(app.deletes[0],json({gallery:removed}));
    assert.equal(app.host.querySelector('[aria-busy]'),newRoot);app.galleryCount(0);app.busy(false);
    assert.equal(app.host.textContent?.includes(success),false,'old completion must not notify the new editor');
    assert.equal(app.deletes.length,1);
   }finally{await app.close();}
  });

  await t.test('negative control: genuine remount with explicitly stale initial input is not proof of a detach defect',async()=>{
   const app=await harness();
   try{
    await app.start();await app.resolve(app.deletes[0],json({gallery:removed}));app.detached();
    await app.render(false);await app.render(true,profile);
    app.galleryCount(1);app.busy(false);
    assert.equal(app.host.textContent?.includes(success),false);
    assert.equal(app.reads.length,0,'OwnerEditor does not fetch profile automatically on remount');
    // This supplies old props deliberately; no evidence says the real server
    // composition supplied old props. It is not a forced RED/product requirement.
    await app.click(app.button(reloadLabel));assert.equal(app.reads.length,1);
    await app.resolve(app.reads[0],json({profile:fresh}));app.galleryCount(0);app.busy(false);
   }finally{await app.close();}
  });

  await t.test('malformed successful mutation DTO is not accepted; authoritative reread recovers without replay',async()=>{
   const app=await harness();
   try{
    await app.start();await app.resolve(app.deletes[0],json({gallery:{...removed,galleryRevision:'invalid'}}));
    app.busy(true);app.galleryCount(1);assert.equal(app.reads.length,1);
    await app.resolve(app.reads[0],json({profile:fresh}));app.galleryCount(0);app.busy(false);
    assert.ok(app.host.querySelector('[role="alert"]'));assert.equal(app.host.textContent?.includes(success),false);
    assert.equal(app.deletes.length,1);
   }finally{await app.close();}
  });

  await t.test('409 and failed rereads preserve the mutation lock until a successful explicit read',async()=>{
   const app=await harness();
   try{
    await app.start();await app.resolve(app.deletes[0],failure('gallery_conflict',409,true));
    app.busy(true);assert.equal(app.reads.length,1);
    await app.resolve(app.reads[0],failure('profile_unavailable',503));
    app.busy(false);app.galleryCount(1);assert.equal(app.button(detachLabel).disabled,true);
    assert.ok(app.host.querySelector('[role="alert"]')?.textContent?.includes('تا بارگذاری دوباره'));
    await app.click(app.button(detachLabel));assert.equal(app.deletes.length,1);
    await app.click(app.button(reloadLabel));await app.resolve(app.reads[1],failure('profile_unavailable',503));
    assert.equal(app.button(detachLabel).disabled,true,'plain failed GET does not unlock');
    await app.click(app.button(reloadLabel));await app.resolve(app.reads[2],json({profile:fresh}));
    app.galleryCount(0);app.busy(false);assert.equal(Array.from(app.host.querySelectorAll('[role="alert"]')).some(node=>Boolean(node.textContent)),false);
    assert.equal(app.deletes.length,1);assert.equal(app.button('ارسال برای بررسی').disabled,false);
   }finally{await app.close();}
  });

  for(const [status,code] of [[403,'forbidden'],[401,'refresh_required']] as const)await t.test(`${status} ${code} never replays a mutation or accepts a gallery result`,async()=>{
   const app=await harness();
   try{
    await app.start();await app.resolve(app.deletes[0],failure(code,status));
    app.galleryCount(1);app.busy(false);assert.ok(app.host.querySelector('[role="alert"]'));
    assert.equal(app.host.textContent?.includes(success),false);assert.equal(app.reads.length,0);assert.equal(app.deletes.length,1);
    if(status===401)assert.ok(app.host.querySelector('a[href="/auth/recover?returnTo=/pro/profile"]'));
   }finally{await app.close();}
  });

  for(const logoutStatus of [200,503])await t.test(`logout generation cancels DELETE and stale summary (logout status ${logoutStatus})`,async()=>{
   const app=await harness();
   try{
    await app.start();await app.click(app.selector('[data-refresh="a"]'));const staleSummary=app.summaries.at(-1)!;
    await app.click(app.selector('[data-logout="b"]'));
    assert.equal(app.summary().logoutPending,true);assert.equal(app.summary().id,null);
    await app.resolve(app.deletes[0],json({gallery:removed}));await app.resolve(staleSummary,json({account}));
    assert.equal(app.summary().id,null);assert.equal(app.host.querySelector('[aria-busy]'),null);
    await app.resolve(app.logouts[0],json({},logoutStatus));
    assert.equal(app.summary().logoutError,logoutStatus!==200);assert.equal(app.summary().id,null);
    assert.equal(app.host.textContent?.includes(success),false);assert.equal(app.host.querySelector('figure'),null);
    assert.equal(app.deletes.length,1);
   }finally{await app.close();}
  });

  await t.test('explicit invalidation cancels an in-flight detach even after access is recovered',async()=>{
   const app=await harness();
   try{
    await app.start();await app.click(app.selector('[data-clear="a"]'));assert.equal(app.summary().logoutError,true);
    await app.resolve(app.deletes[0],json({gallery:removed}));
    await app.click(app.selector('[data-refresh="b"]'));await app.resolve(app.summaries.at(-1)!,json({account}));
    app.galleryCount(1);assert.equal(app.host.textContent?.includes(success),false,'cancelled result was not applied');
    // This test checks rejection, not a new requirement to unlock a cancelled
    // editor. Security cancellation is intentionally preserved unchanged.
    assert.equal(app.deletes.length,1);
   }finally{await app.close();}
  });
 }finally{
  if(activeRoot)await act(async()=>activeRoot!.unmount());
  dom.window.close();
  for(const [key,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}
 }
});
