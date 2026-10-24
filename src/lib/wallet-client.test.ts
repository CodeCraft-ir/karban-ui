import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createWalletClient,parsePending,readPending,savePending,clearTerminal,pendingKey,PaymentClientError,parseClientIntent} from './wallet-client.ts';
const id='12345678-1234-4123-8123-123456789abc';
const other='22345678-1234-4123-8123-123456789abc';
const record={version:1 as const,requestKey:id,packId:'irt-10000' as const,phase:'blocked' as const};
const intent={id,requestKey:id,purpose:'wallet_topup',packId:'irt-10000',catalogVersion:'local-irt-v1',amountIRT:10000,currency:'IRT',state:'pending',createdAt:'2026-10-23T12:00:00.000Z',updatedAt:'2026-10-23T12:00:00.000Z',expiresAt:'2026-10-23T12:15:00.000Z',simulated:true,ledgerId:null,creditedBalanceIRT:null};
function storage(){const map=new Map<string,string>();return {getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};}
test('bounded pending record contains only version, original UUID, catalog pack, phase and optional intent ID',()=>{
 assert.deepEqual(parsePending(JSON.stringify(record)),record);
 for(const bad of ['', '{', 'null', JSON.stringify({...record,version:2}),JSON.stringify({...record,amount:1}),JSON.stringify({...record,requestKey:'x'}),JSON.stringify({...record,packId:'bad'}),JSON.stringify({...record,phase:'retry'}),JSON.stringify({...record,intentId:'x'}),' '.repeat(600)])assert.equal(parsePending(bad),null);
});
test('session record isolates accounts and malformed data is blocked rather than removed',()=>{
 const s=storage();savePending(s,7,record);assert.deepEqual(readPending(s,7),{kind:'record',record});assert.deepEqual(readPending(s,8),{kind:'empty'});
 s.setItem(pendingKey(8),'bad');assert.deepEqual(readPending(s,8),{kind:'invalid'});assert.equal(s.getItem(pendingKey(8)),'bad');
});
test('storage failures are fail closed and cannot be mistaken for empty',()=>{
 const s={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}};
 assert.deepEqual(readPending(s,7),{kind:'unavailable'});assert.throws(()=>savePending(s,7,record));
});
test('terminal cleanup requires same account key and intent, never pending or mismatched',()=>{
 const s=storage();savePending(s,7,{...record,intentId:id});
 for(const dto of [intent,{...intent,id:other,state:'cancelled'},{...intent,requestKey:other,state:'cancelled'}])assert.equal(clearTerminal(s,7,parseClientIntent(dto)),false);
 assert.ok(s.getItem(pendingKey(7)));assert.equal(clearTerminal(s,8,parseClientIntent({...intent,state:'cancelled'})),false);
 assert.equal(clearTerminal(s,7,parseClientIntent({...intent,state:'cancelled'})),true);assert.equal(s.getItem(pendingKey(7)),null);
});
test('client ISO DTO parser uses strict monetary and timestamp contracts, discards private fields',()=>{
 assert.deepEqual(parseClientIntent({...intent,private:'never'}),intent);
 for(const change of [{amountIRT:1},{simulated:false},{createdAt:'bad'},{state:'success'},{ledgerId:1},{state:'succeeded',ledgerId:null}])assert.throws(()=>parseClientIntent({...intent,...change}));
});
test('create sends pack and original key only, correlates response and never repeats',async()=>{
 const calls:{path:string;init?:RequestInit}[]=[];const client=createWalletClient(async(path,init)=>{calls.push({path,init});return Response.json({intent});});
 assert.deepEqual(await client.create(record),intent);assert.equal(calls.length,1);assert.equal(calls[0].path,'/api/payments/local/topups');assert.deepEqual(JSON.parse(String(calls[0].init?.body)),{packId:record.packId,requestKey:id});
});
test('mismatched successful create response is unknown, not permission to create again',async()=>{
 const c=createWalletClient(async()=>Response.json({intent:{...intent,requestKey:other}}));
 await assert.rejects(c.create(record),(e:unknown)=>e instanceof PaymentClientError&&e.uncertain);
});
test('unknown create lookup is exactly one read with original key including 404',async()=>{
 const calls:string[]=[];const c=createWalletClient(async(path,init)=>{calls.push(`${init?.method} ${path}`);return Response.json({error:{code:'local_payment_not_found',message:'PRIVATE'}},{status:404});});
 await assert.rejects(c.lookup(id),PaymentClientError);assert.deepEqual(calls,[`GET /api/payments/local/topups/lookup?requestKey=${id}`]);
});
test('transport and malformed mutation errors require reconciliation',async()=>{
 for(const fetcher of [async()=>{throw Error('PRIVATE');},async()=>Response.json({intent:null}),async()=>Response.json({error:{code:'refresh_required',reconciliationRequired:true}},{status:401})]){
  const c=createWalletClient(fetcher);await assert.rejects(c.confirm(id), (e:unknown)=>e instanceof PaymentClientError&&e.uncertain);
 }
});
test('recovery is explicit one refresh POST then caller controlled GET, no payment replay',async()=>{
 const calls:string[]=[];const c=createWalletClient(async(p,i)=>{calls.push(`${i?.method} ${p}`);return Response.json(p.includes('/auth/')?{}:{intent});});
 await c.refresh();await c.get(id);assert.deepEqual(calls,['POST /api/auth/refresh',`GET /api/payments/local/topups/${id}`]);
});
test('429 and failed reads retain static typed errors without upstream text',async()=>{
 const c=createWalletClient(async()=>Response.json({error:{code:'rate_limited',message:'PRIVATE'}},{status:429}));
 await assert.rejects(c.confirm(id),(e:unknown)=>e instanceof PaymentClientError&&e.status===429&&!e.message.includes('PRIVATE'));
});
