"use client";

import type { FormEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { accountInput, profileInput } from '@/lib/owner-ui';
import type { AccountDto, ProfileDto } from '@/services/profile/profile-contracts';
import type { PublicTerm } from '@/lib/contracts/specialists';

const control='w-full min-h-12 rounded-2xl border border-line bg-elev px-4 py-3 text-fg transition-[border-color,opacity] duration-200 hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50';
function SelectField({id,label,children,defaultValue}:{id:string;label:string;children:ReactNode;defaultValue:string|number}) {
  return <label htmlFor={id} className="block text-sm text-fg-soft">{label}<select id={id} name={id} defaultValue={defaultValue} className={`${control} mt-2`}>{children}</select></label>;
}
function Terms({terms}:{terms:PublicTerm[]}) { return terms.map(term=><option key={term.id} value={term.id}>{term.name}</option>); }
function FormGroup({title,description,children}:{title:string;description?:string;children:ReactNode}) {
 return <fieldset className="min-w-0 space-y-5 border-t border-line pt-5"><legend className="pe-3 text-base font-bold">{title}</legend>{description&&<p className="text-sm leading-7 text-muted">{description}</p>}{children}</fieldset>;
}
function submit(event:FormEvent<HTMLFormElement>,parse:(form:FormData)=>Record<string,unknown>,save:(input:Record<string,unknown>)=>Promise<void>) {
  event.preventDefault();
  const form=event.currentTarget;
  try { const input=parse(new FormData(form)); void save(input); }
  catch { const feedback=form.querySelector<HTMLElement>('[data-validation]');if(feedback){feedback.textContent='ورودی معتبر نیست؛ محدودیت متن و اعداد را بررسی کنید. متن چندخطی پذیرفته نمی‌شود.';feedback.focus();} }
}
export function AccountForm({account,cities,disabled,onSave}:{account:AccountDto;cities:PublicTerm[];disabled:boolean;onSave:(input:Record<string,unknown>)=>Promise<void>}) {
 return <form onSubmit={event=>submit(event,accountInput,onSave)} className="space-y-5">
  <fieldset disabled={disabled} className="min-w-0 space-y-7"><legend className="mb-5 text-lg font-bold">اطلاعات شخصی</legend>
   <div className="grid gap-5 sm:grid-cols-2"><Input id="display_name" name="display_name" label="نام نمایشی (حداکثر ۱۰۰ نویسه)" defaultValue={account.displayName} required maxLength={100} autoComplete="name" /><SelectField id="account_city_id" label="شهر شخصی (اختیاری)" defaultValue={account.location?.id??''}><option value="">پاک کردن شهر</option><Terms terms={cities} />{account.location&&!cities.some(t=>t.id===account.location?.id)&&<option value={account.location.id}>{account.location.name}</option>}</SelectField></div>
   <FormGroup title="شناسه‌های ورود" description="شماره ورود و نقش حساب از این فرم تغییر نمی‌کنند."><div className="grid gap-5 sm:grid-cols-2"><Input id="login-phone" label="شماره ورود؛ فقط خواندنی" value={account.loginPhoneMasked??'در دسترس نیست'} readOnly dir="ltr" /><Input id="account-role" label="نقش حساب؛ فقط خواندنی" value={account.role==='specialist'?'متخصص':'کارفرما'} readOnly /></div></FormGroup>
   <div className="space-y-4 border-t border-line pt-5"><p className="text-sm leading-7 text-muted">آواتار حساب شخصی از تصویر پروفایل حرفه‌ای مستقل است. تغییر نام و شهر، نقش یا شماره ورود را تغییر نمی‌دهد.</p><Button type="submit">ذخیره اطلاعات شخصی</Button></div>
  </fieldset><p data-validation role="alert" tabIndex={-1} className="text-sm text-alert" />
 </form>;
}
export function ProfessionalForm({profile,cities,categories,disabled,onSave}:{profile:ProfileDto;cities:PublicTerm[];categories:PublicTerm[];disabled:boolean;onSave:(input:Record<string,unknown>)=>Promise<void>}) {
 return <form onSubmit={event=>submit(event,profileInput,onSave)} className="space-y-5">
  <fieldset disabled={disabled} className="min-w-0 space-y-8"><legend className="mb-5 text-lg font-bold">اطلاعات حرفه‌ای</legend>
   <FormGroup title="معرفی و مهارت‌ها" description="متن بدون HTML و بدون خط جدید وارد کنید؛ خالی گذاشتن موارد اختیاری آن‌ها را پاک می‌کند.">
    <Input id="title" name="title" label="عنوان حرفه‌ای (حداکثر ۱۶۰ نویسه)" defaultValue={profile.title} required maxLength={160} />
    {([{name:'bio',label:'معرفی؛ حداکثر ۴۰۰۰ نویسه',max:4000,value:profile.bio},{name:'skills',label:'مهارت‌ها؛ حداکثر ۱۰۰۰ نویسه',max:1000,value:profile.skills}] as const).map(field=><label key={field.name} htmlFor={field.name} className="block text-sm text-fg-soft">{field.label}<textarea id={field.name} name={field.name} defaultValue={field.value} maxLength={field.max} rows={3} className={`${control} mt-2 resize-y`} /></label>)}
   </FormGroup>
   <FormGroup title="خدمات و محدوده فعالیت">
    <fieldset className="min-w-0 rounded-2xl border border-line p-4"><legend className="px-2 text-sm">دسته‌های خدمت؛ حداکثر ۱۰ دسته</legend><div className="grid gap-2 sm:grid-cols-2">{[...categories,...profile.categories.filter(c=>!categories.some(t=>t.id===c.id))].map(category=><label key={category.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm hover:bg-wash focus-within:ring-2 focus-within:ring-accent"><input type="checkbox" name="category_ids" value={category.id} defaultChecked={profile.categories.some(c=>c.id===category.id)} className="h-5 w-5 shrink-0 accent-accent" />{category.name}</label>)}</div></fieldset>
    <SelectField id="city_id" label="شهر خدمت (اختیاری)" defaultValue={profile.cities[0]?.id??''}><option value="">پاک کردن شهر خدمت</option><Terms terms={cities} />{profile.cities.filter(c=>!cities.some(t=>t.id===c.id)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</SelectField>
   </FormGroup>
   <FormGroup title="شرایط همکاری"><div className="grid gap-5 sm:grid-cols-2"><SelectField id="availability" label="وضعیت دسترسی (اختیاری)" defaultValue={profile.availability}><option value="">مشخص نشده</option><option value="available">آماده کار</option><option value="busy">مشغول</option><option value="away">در دسترس نیستم</option></SelectField><Input id="experience_years" name="experience_years" label="سابقه کار؛ ۰ تا ۸۰ سال (اختیاری)" type="number" min={0} max={80} step={1} defaultValue={profile.experienceYears??''} /></div><Input id="price_hint" name="price_hint" label="توضیح قیمت؛ حداکثر ۲۰۰ نویسه (اختیاری)" maxLength={200} defaultValue={profile.priceHint} /></FormGroup>
   <FormGroup title="نشانی خصوصی" description="این نشانی عمومی نمایش داده نمی‌شود و از شهر خدمت جداست."><label htmlFor="address" className="block text-sm text-fg-soft">نشانی خصوصی؛ حداکثر ۵۰۰ نویسه<textarea id="address" name="address" defaultValue={profile.address} maxLength={500} rows={3} className={`${control} mt-2 resize-y`} /></label></FormGroup>
   <div className="space-y-4 border-t border-line pt-5"><p className="text-sm leading-7 text-muted">ذخیره، انتشار نیست. پس از ذخیره، وضعیت تازه پروفایل را بررسی کنید.</p><Button type="submit">ذخیره پیش‌نویس تغییرات</Button></div>
  </fieldset><p data-validation role="alert" tabIndex={-1} className="text-sm text-alert" />
 </form>;
}
