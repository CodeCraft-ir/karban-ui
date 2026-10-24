import {parseCreate,parseIntent,parseSummary,parseUuid,object,type IntentDto,type WalletSummaryDto,type PackId} from '../services/payments/payment-contracts.ts';

export interface PendingPayment {version:1;requestKey:string;packId:PackId;phase:'review'|'blocked';intentId?:string;}
export type PendingRead={kind:'empty'}|{kind:'invalid'}|{kind:'unavailable'}|{kind:'record';record:PendingPayment};
export type PaymentStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function pendingKey(accountId:number):string {
 if(!Number.isSafeInteger(accountId)||accountId<1)throw new Error('invalid_account');
 return `karban.wallet.pending.v1.${accountId}`;
}
export function parsePending(raw:string):PendingPayment|null {
 try{
  if(raw.length>512)return null;
  const r=object(JSON.parse(raw));
  if(Object.keys(r).some(k=>!['version','requestKey','packId','phase','intentId'].includes(k))||r.version!==1||!['review','blocked'].includes(String(r.phase)))return null;
  const input=parseCreate({packId:r.packId,requestKey:r.requestKey});
  if(r.phase==='review'&&!r.intentId)return null;
  return {version:1,...input,phase:r.phase as PendingPayment['phase'],...(r.intentId===undefined?{}:{intentId:parseUuid(r.intentId)})};
 }catch{return null;}
}
export function readPending(storage:PaymentStorage,accountId:number):PendingRead {
 try{const raw=storage.getItem(pendingKey(accountId));if(raw===null)return {kind:'empty'};const record=parsePending(raw);return record?{kind:'record',record}:{kind:'invalid'};}catch{return {kind:'unavailable'};}
}
/** A verified durable key BEFORE dispatch is mandatory. No in-memory-only retry path. */
export function savePending(storage:PaymentStorage,accountId:number,record:PendingPayment):void {
 const raw=JSON.stringify(record);if(!parsePending(raw))throw new Error('invalid_pending');
 const key=pendingKey(accountId);storage.setItem(key,raw);if(storage.getItem(key)!==raw)throw new Error('storage_unavailable');
}
export function clearTerminal(storage:PaymentStorage,accountId:number,intent:IntentDto):boolean {
 const stored=readPending(storage,accountId);
 if(intent.state==='pending'||stored.kind!=='record'||stored.record.requestKey!==intent.requestKey||stored.record.intentId!==intent.id)return false;
 try{storage.removeItem(pendingKey(accountId));return storage.getItem(pendingKey(accountId))===null;}catch{return false;}
}
function sqlDate(value:unknown):string {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/u.test(value)||new Date(value).toISOString()!==value)throw new Error('invalid_date');
 return value.replace('T',' ').replace('.000Z','');
}
/** BFF DTO dates are canonical ISO, unlike the WP wire format. Reuse all monetary invariants. */
export function parseClientIntent(raw:unknown):IntentDto {
 const v=object(raw);return parseIntent({...v,createdAt:sqlDate(v.createdAt),updatedAt:sqlDate(v.updatedAt),expiresAt:sqlDate(v.expiresAt)});
}
export function parseClientSummary(raw:unknown):WalletSummaryDto {
 const v=object(raw);if(!Array.isArray(v.items))throw new Error('invalid_summary');
 return parseSummary({...v,items:v.items.map(row=>{const r=object(row);return {...r,createdAt:sqlDate(r.createdAt)};})});
}
export class PaymentClientError extends Error {
 constructor(readonly status=503,readonly code='payment_unavailable',readonly uncertain=false){super('Payment operation unavailable.');}
}
const codes=new Set(['refresh_required','unauthenticated','forbidden','refresh_cancelled','rate_limited','local_payment_not_found','local_payment_request_conflict','local_payment_state_conflict','payment_outcome_unknown','payment_unavailable','local_payment_unavailable','local_payment_schema_not_ready','financial_maintenance','financial_storage_unavailable','invalid_upstream_response','invalid_request']);
export type PaymentFetch=(path:string,init?:RequestInit)=>Promise<Response>;
export function createWalletClient(fetcher:PaymentFetch){
 async function request<T>(path:string,parse:(v:unknown)=>T,method:'GET'|'POST'='GET',body?:object,signal?:AbortSignal):Promise<T>{
  const mutation=method==='POST'&&path!=='/api/auth/refresh';
  let response:Response;
  try{response=await fetcher(path,{method,credentials:'same-origin',cache:'no-store',signal,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});}
  catch{throw new PaymentClientError(503,'payment_unavailable',mutation);}
  const value:unknown=await response.json().catch(()=>null);
  if(!response.ok){
   let code='payment_unavailable',flag=false;
   try{const e=object(object(value).error);if(typeof e.code==='string'&&codes.has(e.code))code=e.code;flag=e.reconciliationRequired===true||e.reloadRequired===true;}catch{/* Static failure only. */}
   // Even a typed 5xx may describe storage after dispatch. Never interpret it as proof of rollback.
   throw new PaymentClientError(response.status,code,mutation&&(flag||response.status>=500));
  }
  try{return parse(value);}catch{throw new PaymentClientError(503,'invalid_upstream_response',mutation);}
 }
 function intent(v:unknown,match:(dto:IntentDto)=>boolean){const d=parseClientIntent(object(v).intent);if(!match(d))throw new Error('correlation');return d;}
 return {
  summary:(signal?:AbortSignal)=>request('/api/wallet/summary',v=>parseClientSummary(object(v).summary),'GET',undefined,signal),
  create:(record:PendingPayment,signal?:AbortSignal)=>{const body=parseCreate({packId:record.packId,requestKey:record.requestKey});return request('/api/payments/local/topups',v=>intent(v,d=>d.requestKey===record.requestKey&&d.packId===record.packId),'POST',body,signal);},
  get:(id:string,signal?:AbortSignal)=>request(`/api/payments/local/topups/${parseUuid(id)}`,v=>intent(v,d=>d.id===id),'GET',undefined,signal),
  lookup:(key:string,signal?:AbortSignal)=>request(`/api/payments/local/topups/lookup?requestKey=${parseUuid(key)}`,v=>intent(v,d=>d.requestKey===key),'GET',undefined,signal),
  confirm:(id:string,signal?:AbortSignal)=>request(`/api/payments/local/topups/${parseUuid(id)}/confirm`,v=>intent(v,d=>d.id===id&&d.state==='succeeded'),'POST',{},signal),
  cancel:(id:string,signal?:AbortSignal)=>request(`/api/payments/local/topups/${parseUuid(id)}/cancel`,v=>intent(v,d=>d.id===id&&d.state==='cancelled'),'POST',{},signal),
  refresh:(signal?:AbortSignal)=>request('/api/auth/refresh',()=>undefined,'POST',{},signal),
 };
}
export function paymentErrorText(error:PaymentClientError):string {
 if(error.uncertain)return 'نتیجه قطعی نیست؛ ممکن است درخواست ثبت شده باشد. دوباره پرداخت نکنید؛ فقط وضعیت همین درخواست را بخوانید.';
 if(error.code==='refresh_required')return 'اعتبار دسترسی تمام شده است؛ بازیابی نشست فقط با انتخاب شما انجام می‌شود و پرداخت تکرار نمی‌شود.';
 if(error.status===401)return 'نشست معتبر نیست؛ دوباره وارد شوید. درخواست پرداخت تکرار نمی‌شود.';
 if(error.status===429)return 'محدودیت تعداد درخواست فعال است؛ صبر کنید و بعد فقط وضعیت را بخوانید. شمارنده بازنشانی نمی‌شود.';
 if(error.status===404)return 'درخواست پیدا نشد؛ این پاسخ، نبودن یک ثبت در حال انجام را ثابت نمی‌کند. کلید قبلی حفظ شده است.';
 return 'اطلاعات پرداخت در دسترس نیست؛ موجودی یا نتیجه‌ای حدس زده نمی‌شود. وضعیت را دوباره بخوانید.';
}
export function paymentPath(id:string):`/wallet/payments/${string}` {return `/wallet/payments/${parseUuid(id)}`;}
