import 'server-only';
import Link from 'next/link';
import {redirect,notFound} from 'next/navigation';
import {readOwnerAccount} from '@/services/profile/profile-bff.server';
import {readWalletSummary,readLocalTopup} from '@/services/payments/payment-bff.server';
import {parseUuid} from '@/services/payments/payment-contracts';
import {paymentPath} from '@/lib/wallet-client';
import {WalletWorkspace} from './WalletWorkspace';
import {PaymentSessionRecovery} from './PaymentSessionRecovery';
import {workspaceClass,workspaceLink} from '../owner/AccountWorkspace';
import {walletLifetimeKey,type WalletError,type WalletInitial} from './wallet-types';
/** The real RSC renderer scopes client state; client wrapper independently defends direct consumers. */
export function WalletWorkspaceBoundary({initial}:{initial:WalletInitial}) {
 return <WalletWorkspace key={walletLifetimeKey(initial)} initial={initial}/>;
}
function publicError(cause:unknown):WalletError {
 const e=cause&&typeof cause==='object'?cause as {code?:unknown;status?:unknown}:{};
 // Static public codes only. No vendor/raw error text is rendered or serialized.
 const codes=['refresh_required','unauthenticated','refresh_cancelled','forbidden','payment_unavailable','local_payment_unavailable','local_payment_not_found','financial_storage_unavailable','local_payment_schema_not_ready','financial_maintenance'];
 return {code:typeof e.code==='string'&&codes.includes(e.code)?e.code:'payment_unavailable',status:typeof e.status==='number'&&[400,401,403,404,409,429,503].includes(e.status)?e.status:503};
}
function Unavailable(){return <section className={workspaceClass} dir="rtl"><h1 className="text-xl font-bold">کیف پول در دسترس نیست</h1><p className="text-sm leading-8 text-muted">دسترسی حساب بررسی نشد؛ موجودی و نتیجه پرداخت نمایش داده نمی‌شود.</p><Link href="/auth/login" className={workspaceLink}>بررسی ورود به حساب</Link></section>;}
/** Authenticated direct read composition. No self HTTP, cookie mutation, refresh or write in render. */
export async function WalletPageContent({id}:{id?:string}){
 // The UUID is validated before it can be used as a transport or recovery target.
 if(id!==undefined){try{parseUuid(id);}catch{notFound();}}
 const target=id?paymentPath(id):'/wallet';
 let account;
 try{account=await readOwnerAccount();}
 catch(cause){const error=publicError(cause);if(error.code==='unauthenticated'||error.code==='refresh_cancelled')redirect('/auth/login');if(error.code==='refresh_required')return <PaymentSessionRecovery target={target}/>;return <Unavailable/>;}
 if(account.role!=='client'&&account.role!=='specialist')return <Unavailable/>;
 let summary=null,intent=null,error:WalletError|null=null;
 try{if(id)intent=await readLocalTopup(id);else summary=await readWalletSummary();}
 catch(cause){error=publicError(cause);if(error.code==='unauthenticated'||error.code==='refresh_cancelled')redirect('/auth/login');if(error.code==='refresh_required')return <PaymentSessionRecovery target={target}/>;}
 if(intent?.state==='succeeded'){
  try{summary=await readWalletSummary();}catch{/* A missing fresh balance is never zero, and does not falsify the persisted receipt. */}
 }
 return <WalletWorkspaceBoundary initial={{account,summary,intent,error,...(id?{targetId:id}:{})}}/>;
}
