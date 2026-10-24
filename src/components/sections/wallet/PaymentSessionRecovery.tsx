'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/Button';
import {useAuthSummary} from '@/components/layout/useAuthSummary';
import {createWalletClient,paymentPath,PaymentClientError,paymentErrorText} from '@/lib/wallet-client';
import {workspaceClass,workspaceLink} from '../owner/AccountWorkspace';

/** Dedicated closed target set. Never consumes returnTo, query status or an owner recovery callback. */
export function PaymentSessionRecovery({target}:{target:'/wallet'|`/wallet/payments/${string}`}){
 const router=useRouter();const auth=useAuthSummary();const used=useRef(false);const controller=useRef<AbortController|null>(null);const identity=useRef<string|null>(null);
 const [attempted,setAttempted]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState<PaymentClientError|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 useEffect(()=>{
  const next=auth.account?`${auth.account.id}:${auth.account.role}`:null;
  if(auth.logoutPending||auth.logoutError||auth.error||identity.current!==null&&!auth.pending&&next!==identity.current)controller.current?.abort();
 },[auth.logoutPending,auth.logoutError,auth.error,auth.pending,auth.account?.id,auth.account?.role,auth.account]);
 async function recover(){
  if(used.current||auth.logoutPending||auth.logoutError)return;used.current=true;setAttempted(true);setBusy(true);
  identity.current=auth.account?`${auth.account.id}:${auth.account.role}`:null;
  const abort=new AbortController();controller.current=abort;
  try{
   const id=target==='/wallet'?null:target.slice('/wallet/payments/'.length);
   const safe=id?paymentPath(id):'/wallet';
   const client=createWalletClient((p,i)=>fetch(p,i));await client.refresh(abort.signal);
   if(abort.signal.aborted)return;
   if(id)await client.get(id,abort.signal);else await client.summary(abort.signal);
   if(abort.signal.aborted)return;
   await auth.refresh();if(abort.signal.aborted)return;
   router.replace(safe);router.refresh();
  }catch(cause){if(!abort.signal.aborted)setError(cause instanceof PaymentClientError?cause:new PaymentClientError());}
  finally{if(!abort.signal.aborted)setBusy(false);}
 }
 return <section className={workspaceClass} dir="rtl" aria-busy={busy}><h1 className="text-xl font-bold">بازیابی دسترسی کیف پول</h1><p className="max-w-2xl text-sm leading-8 text-muted">نشست به تازه‌سازی نیاز دارد. فقط با انتخاب شما تازه می‌شود؛ سپس وضعیت همین صفحه خوانده می‌شود. ایجاد، تأیید و لغو پرداخت تکرار نمی‌شوند.</p>{error&&<p role="alert" className="text-sm leading-8 text-alert">{paymentErrorText(error)}</p>}<div className="flex flex-wrap gap-3"><Button disabled={busy||attempted} onClick={()=>void recover()}>بازیابی نشست و خواندن وضعیت</Button><Link href="/auth/login" className={workspaceLink}>ورود دوباره</Link></div></section>;
}
