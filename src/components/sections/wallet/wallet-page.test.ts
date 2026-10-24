import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as nodeModule from 'node:module';
const {registerHooks}=nodeModule as unknown as {registerHooks(h:{resolve(s:string,c:{parentURL?:string},n:(s:string,c:{parentURL?:string})=>{url:string;shortCircuit?:boolean}):{url:string;shortCircuit?:boolean}}):{deregister():void}};
const id='12345678-1234-4123-8123-123456789abc';
const fixture=globalThis as typeof globalThis&{walletPageFixture?:{account:unknown;summary:unknown;intent:unknown;errorAt?:string;code?:string;reads:string[]}};
const boundary='data:text/javascript,'+encodeURIComponent(`export async function readOwnerAccount(){const f=globalThis.walletPageFixture;f.reads.push('account');if(f.errorAt==='account')throw {code:f.code,status:401};return f.account;} export async function readWalletSummary(){const f=globalThis.walletPageFixture;f.reads.push('summary');if(f.errorAt==='summary')throw {code:f.code,status:503};return f.summary;} export async function readLocalTopup(id){const f=globalThis.walletPageFixture;f.reads.push('intent:'+id);if(f.errorAt==='intent')throw {code:f.code,status:503};return f.intent;}`);
const hooks=registerHooks({resolve(s,c,n){if(s==='server-only')return {url:'data:text/javascript,export{}',shortCircuit:true};if(s==='next/navigation')return {url:'data:text/javascript,export function redirect(p){throw new Error("REDIRECT:"+p)};export function notFound(){throw new Error("NOT_FOUND")};export function useRouter(){return {}}',shortCircuit:true};if(s==='@/services/payments/payment-bff.server'||s==='@/services/profile/profile-bff.server')return {url:boundary,shortCircuit:true};return n(s,c);}});
const {default:WalletPage}=await import('../../../app/wallet/page.tsx');
const {default:PaymentPage}=await import('../../../app/wallet/payments/[id]/page.tsx');
hooks.deregister();
const account={id:7,displayName:'Fixture',role:'client',loginPhoneMasked:null,avatar:null,location:null,specialist:null};
const summary={balanceIRT:42,currency:'IRT',localPaymentReady:false,packs:[],items:[]};
const intent={id,state:'succeeded',ledgerId:1,creditedBalanceIRT:42};
function setup(overrides:object={}){const f={account,summary,intent,reads:[],...overrides};fixture.walletPageFixture=f;return f;}
async function compose(page:Promise<unknown>){const element=await page as {type:(props:object)=>Promise<unknown>;props:object};return await element.type(element.props) as {type:unknown;props:Record<string,unknown>};}
test('actual wallet page composes direct read-only helper for both exact roles',async()=>{for(const role of ['client','specialist']){const f=setup({account:{...account,role}});const view=await compose(Promise.resolve(WalletPage()));assert.deepEqual(f.reads,['account','summary']);assert.equal((view.props.initial as {summary:unknown}).summary,summary);}});
test('payment page awaits Next16 params and reads persisted intent then independent current summary',async()=>{const f=setup();const view=await compose(PaymentPage({params:Promise.resolve({id})}));assert.deepEqual(f.reads,['account',`intent:${id}`,'summary']);assert.equal((view.props.initial as {intent:unknown}).intent,intent);});
test('gate off yields truthful null summary, not zero and no self HTTP',async()=>{const f=setup({errorAt:'summary',code:'payment_unavailable'});const view=await compose(Promise.resolve(WalletPage()));assert.deepEqual(f.reads,['account','summary']);const initial=view.props.initial as {summary:unknown;error:{code:string}};assert.equal(initial.summary,null);assert.equal(initial.error.code,'payment_unavailable');});
test('unauthenticated guard redirects only fixed login, no payment read',async()=>{const f=setup({errorAt:'account',code:'unauthenticated'});await assert.rejects(compose(Promise.resolve(WalletPage())),/REDIRECT:\/auth\/login/);assert.deepEqual(f.reads,['account']);});
test('unexpected actual role denied before summary read',async()=>{const f=setup({account:{...account,role:'administrator'}});const view=await compose(Promise.resolve(WalletPage()));assert.deepEqual(f.reads,['account']);assert.equal(view.props.target,undefined);});
test('expired auth uses dedicated fixed wallet recovery, never owner return target',async()=>{const f=setup({errorAt:'account',code:'refresh_required'});const view=await compose(PaymentPage({params:Promise.resolve({id})}));assert.equal(view.props.target,`/wallet/payments/${id}`);assert.deepEqual(f.reads,['account']);});
test('invalid payment id cannot become transport or recovery redirect path',async()=>{setup();await assert.rejects(compose(PaymentPage({params:Promise.resolve({id:'https://evil.invalid'})})),/NOT_FOUND/);});
test('read-only payment lease expiry gets dedicated recovery even after account read',async()=>{setup({errorAt:'summary',code:'refresh_required'});const view=await compose(Promise.resolve(WalletPage()));assert.equal(view.props.target,'/wallet');});
test('actual server boundary keys machine lifetime by account ID, role and target, never by summary data',async()=>{
 const render=async(overrides:object={},target?:string)=>{
  setup(overrides);const view=await compose(target?PaymentPage({params:Promise.resolve({id:target})}):Promise.resolve(WalletPage()));
  assert.equal((view.type as {name?:string}).name,'WalletWorkspaceBoundary');
  return (view.type as (props:object)=>{key:string})(view.props).key;
 };
 const wallet=await render();assert.equal(wallet,'wallet:7:client:summary');
 assert.equal(await render({summary:{...summary,balanceIRT:90000}}),wallet);
 assert.notEqual(await render({account:{...account,id:8}}),wallet);
 assert.notEqual(await render({account:{...account,role:'specialist'}}),wallet);
 assert.equal(await render({},id),`wallet:7:client:${id}`);
});
test('failure to read fresh summary cannot replace persisted receipt with fake current balance',async()=>{setup({errorAt:'summary',code:'financial_storage_unavailable'});const view=await compose(PaymentPage({params:Promise.resolve({id})}));assert.equal((view.props.initial as {summary:unknown;intent:unknown}).summary,null);assert.equal((view.props.initial as {intent:unknown}).intent,intent);});
