'use client';
import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useAuthSummary} from '@/components/layout/useAuthSummary';
import {Button} from '@/components/ui/Button';
import {workspaceClass,workspaceLink,WorkspacePanel} from '../owner/AccountWorkspace';
import {createActionGate} from '@/lib/owner-client';
import {faNum,faPrice} from '@/lib/utils';
import {createWalletClient,readPending,savePending,clearTerminal,paymentPath,paymentErrorText,PaymentClientError,type PendingPayment,type PendingRead} from '@/lib/wallet-client';
import type {IntentDto,PackId,WalletSummaryDto} from '@/services/payments/payment-contracts';
import {walletLifetimeKey,type WalletInitial} from './wallet-types';

const simulation='فقط اعتبار آزمایشی محلی؛ پول واقعی نیست و پرداخت بانکی انجام نمی‌شود.';
const stateLabels={pending:'در انتظار تصمیم شما',succeeded:'شارژ ثبت شد',cancelled:'درخواست لغو شده',expired:'مهلت درخواست تمام شده',failed:'درخواست ناموفق'};
function Balance({summary}:{summary:WalletSummaryDto|null}){
 return <section className="space-y-2 border-y border-line py-6"><h2 className="text-sm text-muted">موجودی فعلی کیف پول آزمایشی</h2>{summary?<><p data-balance className="break-words text-[clamp(1.75rem,5vw,2.5rem)] leading-relaxed font-bold tabular-nums">{faPrice(summary.balanceIRT)} تومان</p><p className="text-xs leading-7 text-muted">واحد مرجع: IRT (تومان)؛ آخرین خواندن سرور، نه موجودی لحظه‌ای بانک.</p></>:<p role="status" className="text-sm leading-8 text-muted">موجودی فعلی در دسترس نیست؛ صفر فرض نمی‌شود.</p>}</section>;
}
function browserStorage(){return window.sessionStorage;}
interface ReadSnapshot {source:WalletInitial;summary:WalletSummaryDto|null;intent:IntentDto|null;error:PaymentClientError|null;}
function serverSnapshot(initial:WalletInitial):ReadSnapshot {
 return {source:initial,summary:initial.summary,intent:initial.intent,error:initial.error?new PaymentClientError(initial.error.status,initial.error.code):null};
}
/** Internal scope defense also covers consumers that rerender this client component directly. */
export function WalletWorkspace({initial}:{initial:WalletInitial}){
 return <WalletMachine key={walletLifetimeKey(initial)} initial={initial}/>;
}
function WalletMachine({initial}:{initial:WalletInitial}){
 const auth=useAuthSummary();const router=useRouter();
 const client=useMemo(()=>createWalletClient((p,i)=>fetch(p,i)),[]);
 const [reads,setReads]=useState<ReadSnapshot>(()=>serverSnapshot(initial));
 const [stored,setStored]=useState<PendingRead|{kind:'loading'}>({kind:'loading'});
 const [selected,setSelected]=useState<PackId|null>(null);const [busy,setBusy]=useState(false);
 const [blocked,setBlocked]=useState(false);const [notice,setNotice]=useState('');
 // React's guarded render-time prop adjustment prevents even one committed frame
 // with an earlier server snapshot. It does NOT reset form/storage/uncertainty state.
 if(reads.source!==initial){
  const next=serverSnapshot(initial);
  if(reads.error?.uncertain&&(!next.intent||next.intent.state==='pending'))next.error=reads.error;
  setReads(next);setBusy(false);
 }
 const {summary,intent,error}=reads;
 // A callback from an older same-scope RSC snapshot cannot overwrite a newer read.
 const updateRead=(patch:Partial<Omit<ReadSnapshot,'source'>>)=>setReads(state=>state.source===initial?{...state,...patch}:state);
 const setSummary=(value:WalletSummaryDto|null)=>updateRead({summary:value});
 const setIntent=(value:IntentDto)=>updateRead({intent:value});
 const setError=(value:PaymentClientError|null)=>updateRead({error:value});
 const gate=useRef(createActionGate());const controller=useRef<AbortController|null>(null);
 const refreshUsed=useRef(false);const [refreshAttempted,setRefreshAttempted]=useState(false);
 const account=initial.account;
 const valid=!auth.pending&&!auth.error&&!auth.logoutPending&&!auth.logoutError&&auth.account?.id===account.id&&auth.account.role===account.role;
 // Cancel before paint on either lifetime teardown or a fresh same-scope RSC
 // snapshot. Aborting an old write never deletes its durable reconciliation key.
 useLayoutEffect(()=>{const g=gate.current;return ()=>{g.cancel();controller.current?.abort();};},[initial]);
 useEffect(()=>{
  if(valid)return;
  gate.current.cancel();controller.current?.abort();
  let alive=true;queueMicrotask(()=>{if(alive)setBusy(false);});
  return ()=>{alive=false;};
 },[valid,auth.account?.id,auth.account?.role]);
 useEffect(()=>{
  let alive=true;
  queueMicrotask(()=>{if(!alive)return;try{setStored(readPending(browserStorage(),account.id));}catch{setStored({kind:'unavailable'});}});
  return ()=>{alive=false;};
 },[account.id]);
 const record=stored.kind==='record'?stored.record:null;
 const targetId=initial.targetId??initial.intent?.id;
 const checkout=!!targetId;
 const recordConflict=!!record&&!!targetId&&(record.intentId!==targetId||!!intent&&(record.requestKey!==intent.requestKey||record.packId!==intent.packId));
 const durableBlocked=record?.phase==='blocked';
 const storageReady=stored.kind==='empty'||stored.kind==='record';
 const actionBlocked=blocked||durableBlocked||recordConflict||!storageReady;
 function persist(next:PendingPayment){savePending(browserStorage(),account.id,next);setStored({kind:'record',record:next});}
 async function run(operation:(signal:AbortSignal)=>Promise<void>){
  if(!valid)return;
  const action=gate.current.begin();if(!action)return;
  const abort=new AbortController();controller.current=abort;setBusy(true);setError(null);setNotice('');
  // Accept callbacks only inside this generation. Abort is not rollback.
  const current=()=>action.current()&&!abort.signal.aborted;
  try{await operation(abort.signal);}
  catch(cause){if(current())setError(cause instanceof PaymentClientError?cause:new PaymentClientError(503,'payment_unavailable',true));}
  finally{if(current())setBusy(false);action.finish();}
 }
 function current(signal:AbortSignal){return !signal.aborted;}
 function acceptRead(next:IntentDto){
  setIntent(next);
  // Match ALL correlation fields before updating or clearing this account's durable record.
  let existing:PendingRead;
  try{existing=readPending(browserStorage(),account.id);}catch{return;}
  if(existing.kind==='record'&&existing.record.requestKey===next.requestKey&&existing.record.packId===next.packId&&(!existing.record.intentId||existing.record.intentId===next.id)){
   // No intentId means ONLY creation could have been dispatched: creation never credits.
   // A committed owned pending row therefore permits a first, explicit review decision.
   // An ID-bearing blocked record may have a confirm/cancel still in flight and stays blocked.
   const recoveredCreate=!existing.record.intentId&&next.state==='pending';
   const matched:PendingPayment={...existing.record,intentId:next.id,...(recoveredCreate?{phase:'review'}:{})};
   try{persist(matched);if(recoveredCreate)setBlocked(false);if(next.state!=='pending'&&clearTerminal(browserStorage(),account.id,next)){setStored({kind:'empty'});setBlocked(false);}}catch{setStored({kind:'unavailable'});}
  }
 }
 async function freshBalance(signal:AbortSignal){
  try{const next=await client.summary(signal);if(current(signal))setSummary(next);}
  catch{if(current(signal))setSummary(null);}
 }
 async function readStatus(signal:AbortSignal){
  const next=targetId?await client.get(targetId,signal):record?await client.lookup(record.requestKey,signal):null;
  if(!next||!current(signal))return;
  if(record&&(record.requestKey!==next.requestKey||record.packId!==next.packId))throw new PaymentClientError(503,'invalid_upstream_response');
  acceptRead(next);
  if(!checkout){router.push(paymentPath(next.id));return;}
  if(next.state==='succeeded'){setSummary(null);await freshBalance(signal);}
  if(next.state==='pending'&&(blocked||durableBlocked))setNotice('سرور هنوز وضعیت در انتظار را گزارش می‌کند؛ ثبت قبلی ممکن است در حال انجام باشد. تأیید و لغو تکرار نمی‌شوند؛ فقط دوباره وضعیت را بخوانید.');
 }
 async function create(){
  if(!summary?.localPaymentReady||!selected||record||actionBlocked||busy)return;
  await run(async signal=>{
   let next:PendingPayment;
   try{
    // Recheck storage synchronously; a second click/render cannot replace a prior key.
    if(readPending(browserStorage(),account.id).kind!=='empty')throw Error('pending_exists');
    next={version:1,requestKey:crypto.randomUUID(),packId:selected,phase:'blocked'};
    persist(next);
   }catch{setStored({kind:'unavailable'});throw new PaymentClientError(503,'storage_unavailable');}
   setBlocked(true);
   const result=await client.create(next,signal);
   if(!current(signal))return;
   persist({...next,intentId:result.id,phase:'review'});setBlocked(false);
   router.push(paymentPath(result.id));
  });
 }
 async function mutate(kind:'confirm'|'cancel'){
  if(!intent||intent.state!=='pending'||actionBlocked||busy)return;
  await run(async signal=>{
   try{
    const existing=readPending(browserStorage(),account.id);
    if(existing.kind!=='empty'&&(existing.kind!=='record'||existing.record.phase!=='review'||existing.record.requestKey!==intent.requestKey||existing.record.intentId!==intent.id||existing.record.packId!==intent.packId))throw Error('pending_conflict');
    persist({version:1,requestKey:intent.requestKey,packId:intent.packId,intentId:intent.id,phase:'blocked'});
   }catch{setStored({kind:'unavailable'});throw new PaymentClientError(503,'storage_unavailable');}
   setBlocked(true);
   // The mutation response is NOT the displayed receipt. Always read persisted state next.
   await client[kind](intent.id,signal);
   if(!current(signal))return;
   const next=await client.get(intent.id,signal);
   if(!current(signal))return;
   if(next.requestKey!==intent.requestKey||next.packId!==intent.packId)throw new PaymentClientError(503,'invalid_upstream_response',true);
   acceptRead(next);
   if(next.state==='succeeded'){setSummary(null);await freshBalance(signal);}
  });
 }
 const recover=()=>run(async signal=>{
  if(refreshUsed.current)return;
  refreshUsed.current=true;setRefreshAttempted(true);await client.refresh(signal);
  if(!current(signal))return;
  // Refresh has no access to any payment mutation callback.
  if(checkout||record)await readStatus(signal);
  else {const next=await client.summary(signal);if(current(signal))setSummary(next);}
 });
 if(!valid)return <section className={workspaceClass} dir="rtl"><h1 className="text-xl font-bold">بررسی دسترسی کیف پول</h1><p className="leading-8 text-muted">تا بررسی نشست، اطلاعات خصوصی نمایش داده نمی‌شود.</p><Link href="/auth/login" className={workspaceLink}>ورود به حساب</Link></section>;
 return <section className={workspaceClass} dir="rtl" aria-busy={busy}>
  <header className="space-y-4"><nav aria-label="مسیر کیف پول" className="flex flex-wrap gap-2"><Link className={workspaceLink} href={account.role==='specialist'?'/pro':'/dashboard'}>داشبورد {account.role==='specialist'?'متخصص':'کارفرما'}</Link>{checkout&&<Link className={workspaceLink} href="/wallet">کیف پول</Link>}<Link className={workspaceLink} href="/account">حساب شخصی</Link></nav><h1 className="text-[clamp(1.5rem,4vw,2rem)] leading-relaxed font-bold">{checkout?'بررسی پرداخت آزمایشی':'کیف پول آزمایشی'}</h1><p className="max-w-2xl border-s-4 border-primary ps-4 text-sm leading-8 text-fg-soft">{simulation}</p></header>
  <p role="status" aria-live="polite" className="text-sm leading-8 text-muted">{busy?'در حال دریافت پاسخ؛ این درخواست را تکرار نکنید.':notice||'هیچ پرداختی بدون انتخاب صریح شما ارسال نمی‌شود.'}</p>
  {error&&<p role="alert" className="rounded-2xl border border-alert/40 p-4 text-sm leading-8 text-alert">{paymentErrorText(error)}</p>}
  {stored.kind==='invalid'&&<p role="alert" className="text-sm leading-8 text-alert">اطلاعات بازیابی این حساب معتبر نیست. درخواست تازه غیرفعال است؛ داده خراب پاک یا دوباره ارسال نمی‌شود.</p>}
  {stored.kind==='unavailable'&&<p role="alert" className="text-sm leading-8 text-alert">ذخیره کلید بازیابی در این مرورگر ممکن نیست؛ برای جلوگیری از درخواست تکراری، پرداخت غیرفعال است. بدون کلید پایدار، ایجاد یا تأیید انجام نمی‌شود.</p>}
  {error?.status===401&&<div className="flex flex-wrap gap-3">{error.code==='refresh_required'&&!refreshAttempted&&<Button variant="outline" disabled={busy} onClick={()=>void recover()}>بازیابی نشست و خواندن وضعیت</Button>}<Link href="/auth/login" className={workspaceLink}>ورود دوباره</Link></div>}
  {!checkout?<>
   <Balance summary={summary}/>
   <Button variant="ghost" disabled={busy} onClick={()=>void run(async signal=>{const next=await client.summary(signal);if(current(signal))setSummary(next);})}>خواندن موجودی فعلی</Button>
   {record&&<WorkspacePanel title="یک درخواست قبلی دارید" description="تا تعیین نتیجه، درخواست تازه ساخته نمی‌شود. بازیابی فقط کلید همین حساب را می‌خواند و هیچ پرداختی ارسال نمی‌کند."><Button variant="outline" disabled={busy} onClick={()=>void run(readStatus)}>خواندن درخواست قبلی</Button>{record.intentId&&<Link className={workspaceLink} href={paymentPath(record.intentId)}>بررسی درخواست قبلی</Link>}</WorkspacePanel>}
   {summary&&<form onSubmit={event=>{event.preventDefault();void create();}} className="space-y-5">
    <fieldset disabled={busy||!summary.localPaymentReady||!!record||!storageReady||blocked} className="space-y-4"><legend className="text-lg font-bold">انتخاب بسته آزمایشی</legend><p id="pack-help" className="text-sm leading-8 text-muted">مبلغ و واحد از فهرست سرور است. ایجاد درخواست، موجودی را افزایش نمی‌دهد.</p><div className="grid gap-3 sm:grid-cols-3">{summary.packs.map(pack=><label key={pack.packId} className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-card px-4 py-4 transition-colors duration-200 hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-accent has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 active:bg-wash"><input type="radio" name="wallet-pack" value={pack.packId} checked={selected===pack.packId} onChange={()=>setSelected(pack.packId)} aria-describedby="pack-help" className="size-5 shrink-0 accent-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"/><span className="font-bold tabular-nums">{faPrice(pack.amountIRT)} تومان</span></label>)}</div></fieldset>
    {!summary.localPaymentReady&&<p role="status" className="text-sm leading-8 text-muted">شارژ محلی فعال نیست؛ موجودی فقط خواندنی است. فعال‌سازی، مجوز و بررسی مستقل نیاز دارد.</p>}
    <Button type="submit" disabled={busy||!selected||!summary.localPaymentReady||!!record||actionBlocked}>ایجاد درخواست آزمایشی</Button>
   </form>}
  </>:<>
   {intent?<WorkspacePanel title={stateLabels[intent.state]} description="وضعیت از رکورد سرور خوانده شده است؛ نشانی صفحه یا پارامتر موفقیت، رسید نیست.">
    <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-muted">مبلغ بسته</dt><dd className="mt-2 text-lg font-bold">{faPrice(intent.amountIRT)} تومان (IRT)</dd></div><div><dt className="text-muted">مهلت ثبت‌شده سرور</dt><dd className="mt-2 break-words"><time dateTime={intent.expiresAt}>{faNum(intent.expiresAt.replace('T',' ').replace('.000Z',' UTC'))}</time></dd></div><div className="sm:col-span-2"><dt className="text-muted">شناسه درخواست</dt><dd className="mt-2 break-all" dir="ltr">{intent.id}</dd></div></dl>
    {intent.state==='pending'?<><p className="text-sm leading-8 text-muted">تأیید، اعتبار شبیه‌سازی‌شده محلی را ثبت می‌کند؛ برداشت بانکی ندارد. لغو فقط با دکمه زیر و پاسخ سرور انجام می‌شود.</p>{actionBlocked&&<p role="status" className="text-sm leading-8 text-alert">درخواست قبلی هنوز تعیین تکلیف نشده است؛ تأیید و لغو تکرار نمی‌شوند. خواندن وضعیت، پرداخت نیست و وضعیت در انتظار هم اثبات پایان ثبت قبلی نیست.</p>}<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"><Button disabled={busy||actionBlocked} onClick={()=>void mutate('confirm')}>تأیید پرداخت آزمایشی محلی</Button><Button variant="outline" disabled={busy||actionBlocked} onClick={()=>void mutate('cancel')}>لغو درخواست</Button></div></>:intent.state==='succeeded'?<p role="status" className="text-sm leading-8">رسید ثبت‌شده سرور: دفتر کل {faNum(intent.ledgerId!)}؛ موجودی بلافاصله پس از این ثبت: {faPrice(intent.creditedBalanceIRT!)} تومان. این مقدار لزوماً موجودی فعلی نیست.</p>:<p role="status" className="text-sm leading-8 text-muted">این درخواست شارژ موفق نیست؛ افزایش موجودی از آن اعلام نمی‌شود.</p>}
   </WorkspacePanel>:<p role="status" className="text-sm leading-8 text-muted">وضعیت درخواست در دسترس نیست؛ موفقیت یا شکست قطعی اعلام نمی‌شود.</p>}
   <Button variant="outline" disabled={busy} onClick={()=>void run(readStatus)}>خواندن وضعیت پرداخت</Button>
   {intent?.state==='succeeded'&&<Balance summary={summary}/>}
  </>}
 </section>;
}
