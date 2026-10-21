"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Button} from '@/components/ui/Button';
import {useAuthSummary} from '@/components/layout/useAuthSummary';
import {createOwnerClient,createActionGate,OwnerClientError} from '@/lib/owner-client';
import {ownerErrorText,recoveryTarget,type OwnerTarget} from '@/lib/owner-ui';

export function SessionRecovery({target}:{target:OwnerTarget}) {
 const router=useRouter();const {refresh}=useAuthSummary();
 const client=useMemo(()=>createOwnerClient(fetch,refresh),[refresh]);
 const gate=useRef(createActionGate());const [pending,setPending]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{const g=gate.current;return ()=>g.cancel();},[]);
 const recover=async()=>{
  const action=gate.current.begin();if(!action)return;setPending(true);setError('');
  try{
   const destination=recoveryTarget(target);
   if(destination==='/pro/profile')await client.recoverProfile();else await client.recoverAccount();
   if(!action.current())return;
   router.replace(destination);router.refresh();
  }catch(cause){if(action.current())setError(ownerErrorText(cause instanceof OwnerClientError?cause:new OwnerClientError(503,'auth_unavailable')));}
  finally{if(action.current())setPending(false);action.finish();}
 };
 return <section className="mx-auto max-w-xl space-y-5 px-5 py-12"><h1 className="text-2xl font-bold">بازیابی نشست</h1><p className="leading-8 text-muted">اعتبار دسترسی تمام شده است. با انتخاب بازیابی، نشست بررسی و اطلاعات تازه خوانده می‌شود. ذخیره، ارسال پروفایل یا بارگذاری فایل خودکار تکرار نمی‌شود.</p><Button onClick={()=>void recover()} disabled={pending} aria-busy={pending}>{pending?'در حال بررسی نشست...':'بازیابی نشست و خواندن اطلاعات'}</Button>{error&&<p role="alert" className="text-sm leading-7 text-alert">{error}</p>}<Link href="/auth/login" className="owner-link">ورود دوباره</Link></section>;
}
export function OwnerUnavailable(){return <section className="mx-auto max-w-xl space-y-4 px-5 py-12"><h1 className="text-2xl font-bold">اطلاعات حساب در دسترس نیست</h1><p className="leading-8 text-muted">سرویس یا تنظیمات اتصال آماده نیست. این وضعیت به معنی خروج از حساب نیست.</p><Button variant="outline" onClick={()=>window.location.reload()}>بارگذاری دوباره اطلاعات</Button><Link href="/" className="owner-link">خانه</Link></section>;}
